/**
 *
 * @param method
 * @param url
 * @returns {Promise}
 */
function xhr(method, url, responseType) {
    return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        if (responseType !== undefined) {
            xhr.responseType = responseType
        }
        xhr.open(method, url);
        xhr.onload = function () {
            if (this.status >= 200 && this.status < 300) {
                resolve(xhr.response);
            } else {
                reject({
                    status: this.status,
                    statusText: xhr.statusText
                });
            }
        };
        xhr.onerror = function () {
            reject({
                status: this.status,
                statusText: xhr.statusText
            });
        };
        xhr.send();
    });
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        let img = new Image()
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = src
    })
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
