
export function colordropdownEventHandler(){

// Handle opening and closing of custom dropdown
const selectSelected = document.querySelector('.select-selected');
const selectItems = document.querySelector('.select-items');

selectSelected.addEventListener('click', function () {
    selectItems.style.display = selectItems.style.display === 'block' ? 'none' : 'block';
});

document.addEventListener('click', function (event) {
    if (!event.target.closest('.custom-select')) {
        selectItems.style.display = 'none';
    }
});

// Set the selected value
selectItems.addEventListener('click', function (event) {
    selectSelected.textContent = event.target.textContent;
    selectSelected.style.backgroundColor = event.target.style.backgroundColor;
    selectSelected.style.borderRadius = '30px';
    selectSelected.style.border = '3px solid black';
    selectSelected.setAttribute('id', `selected-${event.target.id}`);
    selectItems.style.display = 'none';
});

}

export function getCSSVariableById(id){
return getComputedStyle(document.documentElement).getPropertyValue(id).trim();
}

export function flipFlipButton() {
    const flipButton = document.getElementById('flip-tables-svg');
    flipButton.classList.toggle('flipped');
    document.querySelector('.tables-container-body').classList.toggle('tables-body-flipped');
}

export let fixtureColor = 'black'

export function darkModeBtn() {
    const darkButton = document.getElementById('darkMode-btn');
    const htmlElement = document.documentElement; // Reference to the <html> element

    // Toggle the button state
    darkButton.classList.toggle('darkModeBtn-selected');

    // Toggle the dark mode class on the <html> element
    htmlElement.classList.toggle('dark-mode');

    // Check if dark mode is enabled
    const isDarkMode = htmlElement.classList.contains('dark-mode');

    // Update root CSS variables based on the mode
    const root = document.documentElement;

    const fixItFelix = document.querySelectorAll('.felixFixIt')

    if (isDarkMode) {
        // Apply dark mode CSS variables
        root.style.setProperty('--page-background-color', '#111111');
        root.style.setProperty('--table-header-background-color', '#2e2e2e');
        root.style.setProperty('--table-header-border-bottom-color', '#2e2e2e');
        root.style.setProperty('--table-container-background-color', '#2a2a2a');
        root.style.setProperty('--table-container-border-color', '#2e2e2e');
        root.style.setProperty('--input-element-background-color', '#3b3b3b');
        root.style.setProperty('--input-element-border-color', '#2e2e2e');
        root.style.setProperty('--caption-button-colour', '#2e2e2e');
        root.style.setProperty('--caption-button-colour-hover', '#2e2e2e');
        root.style.setProperty('--caption-button-colour-active', '#2e2e2e');
        root.style.setProperty('--caption-button-border-colour', '#2e2e2e');
        root.style.setProperty('--selected-Caption-Button-Background', '#2e2e2e');
        root.style.setProperty('--title-container-border-color', '#2e2e2e');
        root.style.setProperty('--title-container-background-color', '#2a2a2a');
        root.style.setProperty('--new-node-background-colour', '#2e2e2e');
        root.style.setProperty('--new-component-background-colour', '#2e2e2e');
        root.style.setProperty('--font-family-main', 'monospace');
        fixItFelix.forEach( ou => ou.style.setProperty('stroke', 'rgb(233, 225, 225)'));
        fixtureColor = 'rgb(233, 225, 225)'
    } else {
        // Apply light mode CSS variables
        root.style.setProperty('--page-background-color', 'ivory');
        root.style.setProperty('--table-header-background-color', 'transparent');
        root.style.setProperty('--table-header-border-bottom-color', 'burlywood');
        root.style.setProperty('--table-container-background-color', 'lightyellow');
        root.style.setProperty('--table-container-border-color', 'burlywood');
        root.style.setProperty('--input-element-background-color', 'lemonchiffon');
        root.style.setProperty('--input-element-border-color', 'rgb(172, 143, 105)');
        root.style.setProperty('--caption-button-colour', 'rgb(255, 235, 145)');
        root.style.setProperty('--caption-button-colour-hover', 'rgb(255, 228, 106)');
        root.style.setProperty('--caption-button-colour-active', 'rgb(250, 215, 61)');
        root.style.setProperty('--caption-button-border-colour', 'rgb(172, 143, 105)');
        root.style.setProperty('--selected-Caption-Button-Background', 'burlywood');
        root.style.setProperty('--title-container-border-color', 'rgb(172, 143, 105)');
        root.style.setProperty('--title-container-background-color', 'lightyellow');
        root.style.setProperty('--new-node-background-colour', 'rgb(255, 247, 174)');
        root.style.setProperty('--new-component-background-colour', 'rgb(255, 247, 174)');
        root.style.setProperty('--font-family-main', 'monospace');
        fixItFelix.forEach( ou => ou.style.setProperty('stroke', 'black'));
        fixtureColor = 'black'
    }
}




// const math = require('mathjs');

export function multiplyInverse(A, B) {
    try {
        // Calculate the inverse of A
        const A_inv = math.inv(A);

        // Multiply A^-1 with B
        const result = math.multiply(A_inv, B);

        return result;
    } catch (error) {
        console.error('Error inverting matrix A:', error);
        return null; // Return null or an appropriate error message if inversion fails
    }
}

