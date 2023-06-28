// ==UserScript==
// @name         Images on DEVOPS - DEMO SAMPLE.FLOW & FLOW.SYSTEM
// @namespace    https://makeworkflow.de
// @version      2.2
// @description  Inserts an image from a specified Workitemfield into a the specific workitem on a the kanban board page from flow.system / sample.flow
// @match        https://dev.azure.com/*/*/_boards/board/t/*
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.7.0/jquery.min.js
// @require      https://gist.github.com/raw/2625891/waitForKeyElements.js
// @copyright    MAKE WORK FLOW GmbH
// @author       Feiko Bronsveld
// ==/UserScript==

(function() {
    // ON IMAGE FIELD FOUND
    let imageFieldLabel = 'div.label.text-ellipsis:contains("IMAGE URL")';
    let imageFieldParent = 'div.editable-field.value.not-editing';
    let imageFieldValueElement = 'div.text-ellipsis';

    // ON IMAGE UPDATE
    let onOpenItemImageFieldElement = 'input#__bolt-IMAGE-URL-input';
    let onOpenItemWorkItemIDElement = 'div.flex-row.body-xl.padding-bottom-4.padding-right-8.flex-center';

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

