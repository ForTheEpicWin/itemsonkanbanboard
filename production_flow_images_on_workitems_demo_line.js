// ==UserScript==
// @name         Images on DEVOPS - DEMO PRODUCTION FLOW
// @namespace    https://makeworkflow.de
// @version      1.8.6
// @description  Inserts an image from a specified Workitemfield into a the specific workitem on a the kanban board page from production.flow
// @match        https://dev.azure.com/MWF-Demo-Line/production.flow
// @match        https://dev.azure.com/MWF-Demo-Line/production.flow/_boards/board/t/*
// @match        https://dev.azure.com/yinhwa/YinHwa/*
// @match        https://dev.azure.com/yinhwa/YinHwa/_boards/board/t/*
// @match        https://dev.azure.com/Mondeox/Romania
// @match        https://dev.azure.com/Mondeox/Romania/_boards/board/t/*
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.7.0/jquery.min.js
// @require      https://gist.github.com/raw/2625891/waitForKeyElements.js
// @copyright    MAKE WORK FLOW GmbH
// @author       Feiko Bronsveld
// @sandbox      JavaScript
// @unwrap

// ==/UserScript==

(function() {
    'use strict';

    // ON IMAGE FIELD FOUND
    let imageFieldLabel = 'div.label.text-ellipsis:contains("IMAGE URL")';
    let imageFieldParent = 'div.editable-field.value.not-editing';
    let imageFieldValueElement = 'div.text-ellipsis';

    // ON IMAGE UPDATE
    let onOpenItemImageFieldElement = 'input#__bolt-IMAGE-URL-input';
    let onOpenItemWorkItemIDElement = 'div.flex-row.body-xl.padding-bottom-4.padding-right-8.flex-center';

    // SET DATES TO LOCALE
    let onOpenItemDates = 'time.bolt-time-item.white-space-nowrap';

    // SET small size to big size
    let sizeField = 'div.label.text-ellipsis:contains("SIZE_")';
    let custom06 = 'div.label.text-ellipsis:contains("CUSTOM06")';

    // ExtensionCache DB setup
    const dbName = "ExtensionCacheDB";
    const storeName = "images";
    let db;

    // OPEN DB CONNECTION
    const openDB = () => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, 1);

            request.onupgradeneeded = function(event) {
                db = event.target.result;
                if (!db.objectStoreNames.contains(storeName)) {
                    db.createObjectStore(storeName, { keyPath: "url" });
                }
            };

            request.onsuccess = function(event) {
                db = event.target.result;
                resolve(db);
            };

            request.onerror = function(event) {
                console.error("IndexedDB error:", event.target.errorCode);
                reject(event.target.errorCode);
            };
        });
    };

    // CACHE IMAGE
    const cacheImage = (url, callback) => {
        fetch(url)
            .then(response => {
            if (!response.ok) {
                throw new Error(`Network response was not ok, status: ${response.status}`);
            }

            // Check if the content type of the response is suitable for blob conversion
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("image")) {
                throw new Error(`Response is not an image, content type: ${contentType}`);
            }

            return response.blob();
        })
            .then(blob => {
            // Blob conversion should be successful here
            const transaction = db.transaction([storeName], "readwrite");
            const store = transaction.objectStore(storeName);
            var putRequest = store.put({ url: url, data: blob });

            putRequest.onsuccess = function() {
                console.log("Image cached successfully");
                if (typeof callback === "function") {
                    const URLObject = window.URL || window.webkitURL;
                    const imageURL = URLObject.createObjectURL(blob);
                    callback(imageURL);
                }
            };

            putRequest.onerror = function(event) {
                console.log("Error caching image:", event.target.error);
            };
        })
            .catch(error => console.error('Error during fetching and caching:', error));
    };

    const retrieveImage = (url, callback) => {
        const transaction = db.transaction([storeName]);
        const store = transaction.objectStore(storeName);
        const request = store.get(url);

        request.onsuccess = function(event) {
            if (event.target.result) {
                const URLObject = window.URL || window.webkitURL;
                const imageURL = URLObject.createObjectURL(event.target.result.data);
                callback(imageURL);
            } else {
                cacheImage(url, callback);
            }
        };

        request.onerror = function(event) {
            console.error('Error in retrieving from cache:', event);
        };
    };

    // Initialize IndexedDB
    openDB();

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

    function updateImageElement(imageElement, src, jNode) {
        if (!imageElement.length) {
            let img = document.createElement("img");
            img.src = src;
            img.width = 75;
            img.height = 75;
            img.style.marginRight = "auto";
            img.className = "workItemPictures";
            jNode.parent().parent().prev().children(':first').prepend(img);
        } else {
            imageElement.attr('src', src);
        }
        jNode.parent().hide();
    }

    // ON IMAGE FIELD FOUND
    function onImageFieldFound(jNode) {
        var imageURL = jNode.next(imageFieldParent).find(imageFieldValueElement).text();
        var image = jNode.parent().parent().find("img");

        if (!imageURL || !testImageUrl(imageURL)) {
            console.log("Invalid or empty IMAGE URL, skipping fetch and cache.");
            image.remove();
            return;
        }

        retrieveImage(imageURL, function(cachedSrc) {
            if (cachedSrc) {
                updateImageElement(image, cachedSrc, jNode);
            } else {
                cacheImage(imageURL, function(blob) {
                    const URLObject = window.URL || window.webkitURL;
                    const imageURL = URLObject.createObjectURL(blob);
                    updateImageElement(image, imageURL, jNode);
                });
            }
        });
    }
    waitForKeyElements(imageFieldLabel, onImageFieldFound);

    // ON IMAGE FIELD UPDATE
    function onImageFieldUpdate(jNode) {
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
    function onOpenItemChangeDates(jNode) {
        let datetimeValue = jNode.attr('datetime');
        let dateTime = new Date(datetimeValue);
        let correctFormat = dateTime.toLocaleString();
        jNode.text(correctFormat).css('font-weight', 'bold');
    }
    waitForKeyElements(onOpenItemDates, onOpenItemChangeDates);

    // ON SMALL SIZE MAKE CAPITALS
    function onSizeFieldFound(jNode) {
        jNode.text("SIZE");
    }
    waitForKeyElements(sizeField, onSizeFieldFound);

    // ON SMALL SIZE MAKE CAPITALS
    function onCustom06field(jNode) {
        jNode.text("NAME");
    }
    waitForKeyElements(custom06, onCustom06field);

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

    // Reload all every 10 minutes
    setInterval(function() {
        console.log("Reload whole page");
        location.reload()
    }, 10 * 60 * 1000);

    let doOnce = true;
    setChildrenColor();
})();
