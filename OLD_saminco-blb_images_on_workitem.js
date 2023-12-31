// ==UserScript==
// @name         Images on DEVOPS - Saminco - BLB
// @namespace    https://makeworkflow.de
// @version      1.3.6
// @description  Inserts an image from a specified Workitemfield into a the specific workitem on a the kanban board page from production.flow
// @match        https://dev.azure.com/MWF-Development-Boards/Saminco-BLB
// @match        https://dev.azure.com/MWF-Development-Boards/Saminco-BLB/_boards/board/t/*
// @match        https://dev.azure.com/Saminco/B.L.B%20FOOTWEAR%20PRODUCTION
// @match        https://dev.azure.com/Saminco/B.L.B%20FOOTWEAR%20PRODUCTION/_boards/board/t/*
// @require      https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.7.0/jquery.min.js
// @require      https://gist.gitmirror.com/raw/2625891/waitForKeyElements.js
// @require      https://gist.github.com/raw/2625891/waitForKeyElements.js
// @copyright    MAKE WORK FLOW GmbH
// @author       Feiko Bronsveld
// @unwrap
// ==/UserScript==

(function() {
    // ON IMAGE FIELD FOUND
    let imageFieldLabel = 'div.label.text-ellipsis:contains("IMAGE URL")';
    let imageFieldParent = 'div.editable-field.value.not-editing';
    let imageFieldValueElement = 'div.text-ellipsis';

    // ON IMAGE UPDATE
    let onOpenItemImageFieldElement = 'input#__bolt-IMAGE-URL-input';
    let onOpenItemWorkItemIDElement = 'div.flex-row.body-xl.padding-bottom-4.padding-right-8.flex-center';

    // SET DATES TO LOCALE
    let onOpenItemDates = 'time.bolt-time-item.white-space-nowrap';

    // SET FIELDS ON CARD DIV
    let fieldsOnCardDiv = 'div.fields';

    // WORDS TO TRANSLATE 
    const translationDictionary = {
        "ORDER QTY": "订单数量||ORDER QTY",
        "COLOR": "颜色||COLOR",
        "SIZE_": "码数||SIZE ",
        "SIZE QTY": "码数/数量||SIZE QTY",
        "WIP QTY": "数量||WIP QTY",
        "ETD": "交货日期||ETD"
    };

    // TRANSLATE FIELDS ON ITEM TO CHINESE
    'use strict';
    function fieldsOnCardFound(jNode) {
        // change fields value to right aling
        $('.value').css('text-align', 'right');
        // change edit fields value to the right align
        $('.editor-component').css('text-align', 'right');
        // change fields name to be long
        $('.label').css('overflow', 'visible');

        // Find all 'div.label.text-ellipsis' elements within jNode
        const labelDivs = jNode.find('div.label.text-ellipsis');

        // Process each labelDiv
        labelDivs.each(function() {
            // Get current text of the div
            let text = $(this).text();

            // Ensure text is a string
            if (typeof text === "string") {
                // Replace words based on the dictionary
                for (const [key, value] of Object.entries(translationDictionary)) {
                    const regex = new RegExp(`\\b${key}\\b`, 'gi');
                    text = text.replace(regex, value);
                }

                // Update the div's text content
                $(this).text(text);
            }
        });
    }
    waitForKeyElements(fieldsOnCardDiv, fieldsOnCardFound);

    // TEST IF URL IS VALID IMAGE
    function testImageUrl(url) {
        return new Promise(function(resolve, reject) {
            var image = new Image();

            image.onload = function() {
                resolve(true);
            };

            image.onerror = function() {
                resolve(false);
            };

            image.src = url;
        });
    }

    // ON IMAGE FIELD FOUND
    'use strict';
    function onImageFieldFound(jNode) {
        var imageURL = jNode.next(imageFieldParent).find(imageFieldValueElement).text();
        var image = jNode.parent().parent().find("img");

        // CHECK IF IMAGEURL IS VALID IMAGE
        testImageUrl(imageURL).then(function(isValidImage) {
            if (isValidImage) {
                // check if the WORKITEM already has an image
                if (image.length) {
                    //  already image loaded, dont do anything, HIDE IMG FIELD AND VALUE
                    jNode.parent().hide();
                    return;
                } else {
                    // Create an img element and set its src attribute to the image URL
                    let img = document.createElement("img");
                    img.src = imageURL;
                    img.width = 75;
                    img.height = 75;
                    img.style.marginRight = "auto";
                    img.className = "workItemPictures";

                    // Append the img element to the correct WorkItem Element
                    jNode.parent().parent().prev().children(':first').prepend(img);
                    // hide the imageURL field label and value
                    jNode.parent().hide();
                }
            } else {
                // NO VALID LINK OR EMPTY FIELD REMOVE IMAGE
                image.remove();
                return;
            }
        });
    }
    waitForKeyElements(imageFieldLabel, onImageFieldFound);

    // ON IMAGE FIELD UPDATE
    'use strict';
    function onImageFieldUpdate(jNode) {
        // FORCE UPDATE BEFORE SHOWING FIELDS
        autoUpdate();

        // get all buttons
        var buttons = $('button');
        // get initial imageURL value
        var initialImageURL = jNode.attr('value');

        //updated picture and give feedback to user
        jNode.on('change', function() {
            // GET new image url on change
            var newImageURL = $(this).val();
            // Get all images on board with the old image
            var targetImages = $(`img[src="${initialImageURL}"]`);

            // ONLY DO SOMETGING IF NEW URL AND NewImageURL not empty
            if (newImageURL !== initialImageURL && newImageURL) {

                // TEST IF IMAGE URL IS VALID IMG
                testImageUrl(newImageURL).then(function(isValidImage) {
                    if (isValidImage) {
                        buttons.prop('disabled', false);
                        jNode.css('color', 'green');
                        // console.log("URL is a valid image.");
                        // SET NEW IMAGE
                        targetImages.attr("src", newImageURL);
                    } else {
                        buttons.prop('disabled', true);
                        jNode.css('color', 'red');
                        jNode.val('Not valid image link!');
                        jNode.attr('value', 'Not a valid image linke!');
                        // console.log("URL is not a valid image.");
                        // REMOVE OLD IMAGE
                        targetImages.remove();
                    }
                });
            } else if (!newImageURL) {
                buttons.prop('disabled', false);
                targetImages.remove();
            }
        });
    }

    waitForKeyElements(onOpenItemImageFieldElement, onImageFieldUpdate);

    // ON OPEN ITEM CHANGE DATES
    'use strict';
    function onOpenItemChangeDates(jNode) {
        let datetimeValue = jNode.attr('datetime');
        let dateTime = new Date(datetimeValue);
        let correctFormat = dateTime.toLocaleString();
        jNode.text(correctFormat).css('font-weight', 'bold');
    }
    waitForKeyElements(onOpenItemDates, onOpenItemChangeDates);

    function autoUpdate(){
        // check if image exists and image is there, remove image
        var images = $('img.workItemPictures');

        images.each(function() {
            var image = $(this);
            var imageField = image.parent().parent().parent().find(imageFieldLabel);
            var imageURL = imageField.next(imageFieldParent).find(imageFieldValueElement).text();

            // if imagefield is empty remove old picture
            if (imageField.length === 0) {
                image.remove();
            } else if (image.attr('src') != imageURL) {
                // if image url and image have different URL update it
                image.attr("src", imageURL);
            }
        });
    }

    function setChildrenColor(){
        const headerElements = document.querySelectorAll('.flex-column.kanban-board-row.expanded');
        const flagCardColors = document.querySelectorAll('div.card-flag');

        if (headerElements.length > 0 && flagCardColors.length > 0 ) {
            if (doOnce){
                // set all colors correct ONCE
                flagCardColors.forEach(flagCardColor => {
                    // Target element found
                    const headerPath = flagCardColor.parentNode.parentNode.parentNode.previousElementSibling
                    // only set color if exists
                    if (headerPath) {
                        const headerColor = getComputedStyle(headerPath).backgroundColor;
                        flagCardColor.style.backgroundColor = headerColor;
                    }
                });
                doOnce = false;
            }

            // Create a new MutationObserver
            headerElements.forEach(targetElement => {
                const observer = new MutationObserver(function(mutationsList) {
                    for (let mutation of mutationsList) {
                        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                            const filteredNodes = Array.from(mutation.addedNodes).filter(node => node.classList.contains('wit-card'));
                            if (filteredNodes.length > 0) {
                                handleChildAdded(filteredNodes);
                            }
                        }
                    }
                });

                // Configure and start the observer
                const observerConfig = {
                    childList: true,
                    subtree: true
                };
                observer.observe(targetElement, observerConfig);

                // Handle child added event
                function handleChildAdded(addedNodes) {
                    addedNodes.forEach(function(node) {
                        if (node instanceof HTMLElement) {
                            const headerColor = getComputedStyle(node.firstElementChild.parentNode.parentNode.parentNode.previousElementSibling).backgroundColor;
                            node.firstElementChild.style.backgroundColor = headerColor;
                        }
                    });
                };
            });
        } else {
            // Target element not found, retry after a delay
            setTimeout(setChildrenColor, 250);
        }
    }

    function delayedFunction() {
        // Code to be executed after 200ms
        console.log('Delayed function executed!');
    }

    // Reload all the image and its fields every 5 minutes
    setInterval(function() {
        console.log("Auto Updated pictures on workitems");
        autoUpdate();
    }, 5 * 60 * 1000);

    // Reload all every hour
    setInterval(function() {
        console.log("Reload whole page");
        location.reload(true)
    }, 60 * 60 * 1000);

    let doOnce = true;
    setChildrenColor();
})();
