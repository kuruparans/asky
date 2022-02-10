window.addEventListener('DOMContentLoaded', (event) => {
    let uploadImageButton = document.getElementById('uploadImageButton');
    uploadImageButton.addEventListener('change', (event) => { // onchange event fires after file chosen
        uploadImage();
    });
    let videoCaptureButton = document.getElementById('videoCaptureButton');
    videoCaptureButton.addEventListener('click', (event) => {
        loadCameraVideo();
    });
    let brightnessButton = document.querySelectorAll('input[name="brightnessType"]');
    brightnessButton.forEach(function(button) {
        button.addEventListener('click', (event) => {
            readCanvas();
        });
    });
    let invertButton = document.getElementById('invertButton');
    invertButton.addEventListener('click', (event) => {
        readCanvas();
    });
    let colourButton = document.getElementById('colourButton');
    colourButton.addEventListener('click', (event) => {
        readCanvas();
    });
    loadImage();
});

async function loadCameraVideo() {
    let constraints = {'video': true};
    let stream = null;
    try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        window.stream = stream;
        let videoElement = document.getElementById('videoSource');
        videoElement.style.display = 'inline';
        videoElement.srcObject = stream;
    } catch (error) {
        alert('Camera access issue, refresh and try again.');
        console.error(error);
        return;
    }
    updateScreen();
}

function uploadImage() {
    let imageFile = document.getElementById('uploadImageButton').files[0];
    let reader = new FileReader();
    reader.addEventListener('load', function() {
        loadImage(reader.result, true);
    });
    if (imageFile) {
        reader.readAsDataURL(imageFile);
    }
}

function updateScreen() {
    let videoCaptureButton = document.getElementById('videoCaptureButton');
    videoCaptureButton.style.display = 'none';
    let screenshotButton = document.getElementById('screenshotButton');
    screenshotButton.style.display = 'inline';
    screenshotButton.addEventListener('click', () => {
        takeScreenshot();
    });
}

function takeScreenshot() {
    let videoElement = document.getElementById('videoSource');
    let canvasElement = document.getElementById('sourceImage');
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
    canvasElement.getContext("2d").drawImage(videoElement, 0, 0);

    loadImage(videoElement);
}

function loadImage(sourceMedia, uploadFlag) {
    let sourceImage = new Image();
    sourceImage.crossOrigin = 'anonymous';

    if (!sourceMedia || uploadFlag) {
        let imageName;
        if (uploadFlag)
            imageName = sourceMedia;
        else
            imageName = 'manchette.jpg';
        sourceImage.src = imageName;
        sourceImage.onload = function() {
            loadCanvas(sourceImage, this.naturalWidth, this.naturalHeight);
        };
    } else {
        loadCanvas(sourceMedia);
    }
}

function loadCanvas(sourceImage, sourceWidth, sourceHeight) {
    let canvasElement = document.getElementById('sourceImage');

    let sourceImageWidth = sourceWidth ? sourceWidth : canvasElement.width;
    let sourceImageHeight = sourceHeight ? sourceHeight : canvasElement.height;
    let windowWidth = window.innerWidth;
    let windowHeight = window.innerHeight;

    let pixelWidthPerCharacter = 1800 / 150; // baseline desktop screen fits 150 characters for 1800px width screen
    let resizedImageWidthFactor = 1;
    if (pixelWidthPerCharacter * sourceImageWidth > windowWidth)
        resizedImageWidthFactor = windowWidth / (pixelWidthPerCharacter * sourceImageWidth);

    let resizedWidth = Math.round(sourceImageWidth * resizedImageWidthFactor);
    let resizedHeight = Math.round(resizedWidth / sourceImageWidth * sourceImageHeight);

    canvasElement.width = resizedWidth;
    canvasElement.height = resizedHeight;

    let canvasContext = canvasElement.getContext('2d');
    canvasContext.drawImage(sourceImage, 0, 0, resizedWidth, resizedHeight);

    readCanvas();
}

function readCanvas() {
    let canvasElement = document.getElementById('sourceImage');
    let canvasContext = canvasElement.getContext('2d');
    let sourceImageData = canvasContext.getImageData(0, 0, canvasElement.width, canvasElement.height).data;
    let sourceImagePixelArray = readImageData(sourceImageData, canvasElement.width, canvasElement.height);

    let [brightnessType, colourFlag, invertedFlag] = readAsciiSettings();
    let imageAsciiArray = getAsciiArray(sourceImagePixelArray, canvasElement.width, canvasElement.height, brightnessType, colourFlag, invertedFlag);

    outputAsciiArray(imageAsciiArray);
}

function readAsciiSettings() {
    let brightnessType = document.querySelector('input[name="brightnessType"]:checked').value;
    let invertedFlag = document.getElementById('invertButton').checked;
    let colourFlag = document.getElementById('colourButton').checked;
    return [brightnessType, colourFlag, invertedFlag];
}

function readImageData(imageData, imageWidth, imageHeight) {
    let imagePixelArray = [];
    let currentPositionColumn = 0;
    let currentRowPixels = [];
    for (let i = 0; i < imageData.length; i += 4) {
        currentPixel = new Pixel(imageData[i + 0], imageData[i + 1], imageData[i + 2], imageData[i + 3]);
        currentRowPixels.push(currentPixel);
        currentPositionColumn++;

        if (currentPositionColumn === imageWidth) {
            imagePixelArray.push(currentRowPixels);
            currentRowPixels = [];
            currentPositionColumn = 0;
        }
    }
    return imagePixelArray;
}

function getAsciiArray(imagePixelArray, imageWidth, imageHeight, brightnessType='average', colourFlag=false, invertedFlag=false) {
    let imageAsciiArray = []
    for (let row = 0; row < imageHeight; row++) {
        let currentAsciiRow = [];
        for (let column = 0; column < imageWidth; column++) {
            currentAsciiRow.push(imagePixelArray[row][column].toAscii(brightnessType, colourFlag, invertedFlag));
        }
        imageAsciiArray.push(currentAsciiRow);
    }
    return imageAsciiArray;
}

function outputAsciiArray(imageAsciiArray) {
    asciiString = '';
    for (let i = 0; i < imageAsciiArray.length; i++) {
            asciiString = asciiString + imageAsciiArray[i].join('') + '\n';
    }
    document.getElementById('asciiOutput').innerHTML = asciiString;
}

class Pixel {
    static asciiCharacterMap = "`^\",:;Il!i~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";

    constructor(red, green, blue, alpha) {
        this.red = red;
        this.green = green;
        this.blue = blue;
    }
    luminosity() {
        return 0.21 * this.red + 0.72 * this.green + 0.07 * this.blue;
    }
    lightness() {
        return (Math.max(this.red, this.green, this.blue) + Math.min(this.red, this.green, this.blue)) / 2;
    }
    average() {
        return (this.red + this.blue + this.green) / 3;
    }

    toAscii(brightnessType, colourFlag, invertedType) {
        let percentBrightness;
        switch(brightnessType) {
            case 'luminosity':
                percentBrightness = this.luminosity() / 255;
                break;
            case 'lightness':
                percentBrightness = this.lightness() / 255;
                break;
            case 'average':
            default:
                percentBrightness = this.average() / 255;
        }
        if (!invertedType)
            percentBrightness = 1 - percentBrightness;
        let asciiCharacterMapIndex = Math.floor(percentBrightness * Pixel.asciiCharacterMap.length) - 1;
        if (asciiCharacterMapIndex < 0)
            asciiCharacterMapIndex = 0;
        let asciiChar = Pixel.asciiCharacterMap[asciiCharacterMapIndex];
        if (!asciiChar) {
            console.error('Error with ASCII toString on: ', this);
            return;
        }
        if (colourFlag)
            return `<span style="color:rgb(${this.red},${this.green},${this.blue});">` + asciiChar.repeat(2) + '</span>';
        return asciiChar.repeat(2);
    }
}