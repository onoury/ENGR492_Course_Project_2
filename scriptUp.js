/////////////////////////////////////////// Imports ////////////////////////////////////////////////////////////

import { colordropdownEventHandler, getCSSVariableById, flipFlipButton, darkModeBtn, fixtureColor} from './helperFunctions.js';
import { createStiffnessMatrix, createDisplacementVector, createForceVector, solveForDisplacements, solveForElementResults} from './ENGR492_CP2_submission.js';

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const htmlel = document.documentElement

////////////////////////////////////////////classes//////////////////////////////////////////////////////////////////

export class Node {
    constructor(x, y) {
      this.x = x;
      this.y = y;
    }
}

export class Element {
    constructor(Ni, Nf, Material, Ar) {
        this.xi = Ni.x;
        this.yi = Ni.y;
        this.xj = Nf.x;
        this.yj = Nf.y;

        this.Ni = Ni;
        this.Nf = Nf;

        this.Material = Material;

        this.El = Material.El;

        this.Ar = Ar;
        this.length = Math.sqrt(Math.pow((this.xj - this.xi), 2) + Math.pow((this.yj - this.yi),2));
        this.l = (this.xj - this.xi) / this.length;
        this.m = (this.yj - this.yi) / this.length;
        
        this.a = this.l * this.l * Ar * this.El / (this.length/10);
        this.b = this.l * this.m * Ar * this.El / (this.length/10);
        this.c = this.m * this.m * Ar * this.El / (this.length/10);

    }
  }

export class Fixture {
    constructor(Node, Angle, Type) {
        this.Node = Node;
        if(Angle < 0 || Angle > 360){ Angle = Math.abs(Angle % 360); }
        this.Angle = Angle;
        this.Type = Type;
    }
}

export class Force {
    constructor(Node, Angle, Value) {  
        this.Type = "force";
        if(Angle < 0 || Angle > 360){ Angle = Math.abs(Angle % 360); }
        this.Node = Node;
        this.Angle = Angle;
        this.Value = Value;
    }
}



///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/////////////////////////////////////////// Initial States ////////////////////////////////////////////////////////////

export let materials = [
    { id: "Steel",     El: 30e6, color: 'rgb(57, 64, 65)'},
    { id: "Aluminium", El: 11e6, color: 'darkgray'}, 
];

export let nodes = [
    new Node(120, 0),
    new Node(120, 60),
    new Node( 0 , 0),
    new Node( 0 , 100),
];

export let elements = [
    new Element(nodes[0],nodes[1], materials[0], 0.1963), // 1 - 2
    new Element(nodes[0],nodes[2], materials[1], 0.1257), // 1 - 3
    new Element(nodes[1],nodes[2], materials[0], 0.1963), // 2 - 3
    new Element(nodes[1],nodes[3], materials[1], 0.1257), // 2 - 4
    new Element(nodes[2],nodes[3], materials[0], 0.1963), // 3 - 4
];

export let components = [
    new Force(nodes[0], 240, 2000),
    new Fixture(nodes[2], 0, 'roller'),
    new Fixture(nodes[3], 0, 'fixed'),
]

// colours for the nodes 
let colours = ['red', 'green', 'lightcoral', 'orange', 'lightseagreen', 'cyan','lawngreen','yellow','pink']

let calcDisplacementMatrix = null;
let reactForceMatrix = null;

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/////////////////////////////////////////// Initialize GUI ////////////////////////////////////////////////////////////
function initializeGUI() {

    let nodeColourIndex = []
    // Clear previous nodes and elements

    try{document.querySelectorAll('.tables-input').forEach((inputElement) => {inputElement.removeEventListener('change')});}catch(e){}
    try{document.querySelectorAll('.nodeSvg').forEach((nodeSvg) => {nodeSvg.removeEventListener('click')});}catch(e){}

    document.getElementById("node-circles").innerHTML = '';
    document.getElementById("element-lines").innerHTML = '';
    document.getElementById("component-paths").innerHTML = '';

    document.getElementById("node-labels").innerHTML = '';
    document.getElementById("element-labels").innerHTML = '';
    
    document.getElementById('node-values-table').innerHTML = '';
    document.getElementById('element-values-table').innerHTML = '';
    document.getElementById('component-values-table').innerHTML = '';
    
    // add the nodes to the svg
    nodes.forEach((node, index) => {
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        const circleText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        
        circle.setAttribute('id', `node${index + 1}circle`)
        circle.setAttribute('class', 'nodeSvg')
        circle.setAttribute("cx", node.x);
        circle.setAttribute("cy", 100-node.y);
        circle.setAttribute("r", 4.375);
        circle.setAttribute("fill", colours[index]);
        circle.setAttribute("stroke", "black");

        circleText.setAttribute("x", node.x);
        circleText.setAttribute("y", 100-node.y+2);
        circleText.setAttribute("font-size", 6);
        circleText.setAttribute("font-weight", 'bolder');
        circleText.setAttribute("fill", 'white');
        circleText.setAttribute("text-anchor", 'middle');
        circleText.setAttribute("z-index", '99');
        circleText.setAttribute("style", 'user-select: none;');

        circleText.innerHTML = index+1;

        document.getElementById("node-circles").appendChild(circle);
        document.getElementById("node-labels").appendChild(circleText);

        nodeColourIndex.push(index);

        // <text x="120" y="102" font-size="6" text-anchor="middle" fill="white">5</text>

        
        circle.addEventListener('click', function () {
            selectNode(index, circle);
        });

        circle.addEventListener('mousedown', (event) => {
                selectNode(index, circle);
                // When mouse is pressed on a node
                selectedNode = index;

                offsetX = (event.clientX - (circle.getAttribute('cx')));
                offsetY = (event.clientY - (circle.getAttribute('cy')));

                document.addEventListener('mousemove', dragNode);
                document.addEventListener('mouseup', stopDragging);
        });

        circle.addEventListener('touchstart', function () {
            selectNode(index, circle);
        });

        circle.addEventListener('touchstart', (event) => {
                selectNode(index, circle);
                // When mouse is pressed on a node
                selectedNode = index;

                offsetX = (event.clientX - (circle.getAttribute('cx')));
                offsetY = (event.clientY - (circle.getAttribute('cy')));

                document.addEventListener('touchmove', dragNode);
                document.addEventListener('touchend', stopDragging);
                document.addEventListener('touchleave', stopDragging);
                document.addEventListener('touchcancel', stopDragging);
        });

    });

    // add the elements to the svg
    elements.forEach((element, index) => {

        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        const elementText = document.createElementNS("http://www.w3.org/2000/svg", "text");

        line.setAttribute("x1", element.xi);
        line.setAttribute("y1", 100-element.yi);
        line.setAttribute("x2", element.xj);
        line.setAttribute("y2", 100-element.yj);
        line.setAttribute("stroke-linecap", "round");
        line.setAttribute("stroke-width", "0.2rem");
        line.setAttribute("stroke", `black`);
        line.setAttribute("stroke", `${element.Material.color}`);

        elementText.setAttribute("x", (element.xj+element.xi)/2);
        elementText.setAttribute("y", (((100-element.yj)+(100-element.yi))/2) +2);
        elementText.setAttribute("font-size", 6);
        elementText.setAttribute("font-weight", 'bolder');
        elementText.setAttribute("fill", 'white');
        elementText.setAttribute("text-anchor", 'middle');
        elementText.setAttribute("z-index", '99');
        elementText.setAttribute("style", 'text-shadow: 0px 0px 4px #000000; user-select: none;');

        elementText.innerHTML = index+1;

        document.getElementById("element-lines").appendChild(line);
        document.getElementById("element-labels").appendChild(elementText);


    });

    // add components to the svg
    components.forEach((component, index) => {
        if(component.Type === 'force') {
            const force = document.createElementNS("http://www.w3.org/2000/svg", "path");
            force.setAttribute("d", `m ${component.Node.x + 7} ${100-component.Node.y} l 25 0 m 0 0 l -5 4 m 5 -4 l -5 -4`);
            force.setAttribute("fill", "none");
            force.setAttribute("stroke", "red");
            force.setAttribute("stroke-width", "2px");
            force.setAttribute("stroke-linecap", "round");
            force.style.transform = `rotate(-${component.Angle}deg)`;
            force.style.transformOrigin = `${(component.Node.x)/2}% ${(100-component.Node.y)/1.5}%`;
            document.getElementById("component-paths").appendChild(force);
        } else if(component.Type === 'roller') {
            const support = document.createElementNS("http://www.w3.org/2000/svg", "path");
            support.setAttribute("d", `m ${component.Node.x} ${100-component.Node.y} l -8 8 m 8 -8 l -8 -8 m 0 -2 l 0 20 m 0 -2.5 a 1 1 0 0 0 -5 0 a 1 1 0 0 0 5 0 m 0 -5 a 1 1 0 0 0 -5 0 a 1 1 0 0 0 5 0 m 0 -5 a 1 1 0 0 0 -5 0 a 1 1 0 0 0 5 0 m 0 -5 a 1 1 0 0 0 -5 0 a 1 1 0 0 0 5 0`);
            support.setAttribute("fill", "none");
           

            support.setAttribute("stroke", fixtureColor);


            support.setAttribute("class", "felixFixIt");
            support.setAttribute("stroke-width", "2px");
            support.setAttribute("stroke-linecap", "round");
            support.style.transform = `rotate(-${component.Angle}deg)`;
            support.style.transformOrigin = `${(component.Node.x)/2}% ${(100-component.Node.y)/1.5}%`;
            document.getElementById("component-paths").appendChild(support);
        } else if(component.Type === 'fixed') {
            const support = document.createElementNS("http://www.w3.org/2000/svg", "path");
            support.setAttribute("d", `m ${component.Node.x} ${100-component.Node.y} l -8 8 m 8 -8 l -8 -8 m 0 -2 l 0 20 m 0 -1 l -3 -3 m 3 3 m 0 -5 l -3 -3 m 3 3 m 0 -5 l -3 -3 m 3 3 m 0 -5 l -3 -3 m 3 3`);
            support.setAttribute("fill", "none");


            support.setAttribute("stroke", fixtureColor);

            
            support.setAttribute("class", "felixFixIt");
            support.setAttribute("stroke-width", "2px");
            support.setAttribute("stroke-linecap", "round");
            support.style.transform = `rotate(-${component.Angle}deg)`;
            support.style.transformOrigin = `${(component.Node.x)/2}% ${(100-component.Node.y)/1.5}%`;
            document.getElementById("component-paths").appendChild(support);
        }

    });

    // add the nodes to the table
    nodes.forEach((node, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `<td class="node-table-icon" id='node-icon-${index+1}'>Node ${index+1}</td>
                        <td><input class="tables-input" type="number" value="${node.x}" id="x${index+1}"></td>
                        <td><input class="tables-input" type="number" value="${node.y}" id="y${index+1}"></td>`;
        document.getElementById('node-values-table').appendChild(row);
        document.getElementById(`node-icon-${index+1}`).style.backgroundColor = colours[index];
    });

    // add the elements to the table
    elements.forEach((element, index) => { // add min an max values so you cant choose nodes that dont exist
        const rowgap = document.createElement('tr') ;
        rowgap.className = 'row-gap';
        document.getElementById('element-values-table').appendChild(rowgap);
        
        const row = document.createElement('tr');

        let materialSelection = ``
        let matIndex = 0;
        materials.forEach((mat) => {
            if(element.Material.id === mat.id){
                materialSelection += `<option value="${matIndex}" selected>${mat.id}</option>`;
                matIndex++;
            }else{
                materialSelection += `<option value="${matIndex}">${mat.id}</option>`;
                matIndex++;
            }
        });

        row.innerHTML = `<td class="ele">Bar ${index+1}</td>
                        <td class="node-connectivity-td"><input type="number" class="n${nodes.findIndex(obj => obj === element.Ni) + 1} node-connectivity-node-icon tables-input" id="E${index+1}Ni" value="${nodes.findIndex(obj => obj === element.Ni) + 1}"></input> <b>=></b> <input type="number" class="n${nodes.findIndex(obj => obj === element.Nf) + 1} node-connectivity-node-icon tables-input" id="E${index+1}Nf" value="${nodes.findIndex(obj => obj === element.Nf) + 1}"></input></td>
                        <td><input type="number" value="${element.Ar}" id="E${index+1}A" step=".01" class="Cross-Section-input tables-input"></td>
                        <td><select id="material-dropdown-${index+1}" class='material-dropdown tables-input' name="dropdown" title="materialAttribute">
                        ${materialSelection}
                        </select></td>`;
        document.getElementById('element-values-table').appendChild(row);
        document.getElementById(`E${index+1}Ni`).style.backgroundColor = colours[nodeColourIndex[nodes.findIndex(obj => obj === element.Ni)]];
        document.getElementById(`E${index+1}Nf`).style.backgroundColor = colours[nodeColourIndex[nodes.findIndex(obj => obj === element.Nf)]];
        document.getElementById(`material-dropdown-${index+1}`).style.backgroundColor= element.Material.color;
        document.getElementById(`material-dropdown-${index+1}`).style.color= 'white';

    });

    // add the components to the table
    let forceIndex = 0;
    let fixtureIndex = 0;
    let rollerIndex = 0;

    components.forEach((component, index) => {
        const row = document.createElement('tr');

        if(component.Type === 'force') {
            row.innerHTML = `<td class="component">Force ${forceIndex+1}</td>
                            <td  class="center-text"><input class="comp-node tables-input" id='force${forceIndex+1}N' value='${nodes.findIndex(obj => obj === component.Node) + 1}'></input></td>
                            <td><input class="angle-input tables-input" type="number" min="0" max="360" value="${component.Angle}" id="ForceAngle${forceIndex+1}" ></td>
                            <td><input class="tables-input" type="number" value="${component.Value}" id="ForceValue${forceIndex+1}"></td>`;
                            document.getElementById('component-values-table').appendChild(row);
                            document.getElementById(`force${forceIndex+1}N`).style.backgroundColor = colours[nodeColourIndex[nodes.findIndex(obj => obj === component.Node)]];
            forceIndex++;

        } else if(component.Type === 'roller') {
            row.innerHTML = `<td class="component">Roller support ${rollerIndex+1}</td>
                            <td class="center-text"><input class="comp-node tables-input" id='roller${rollerIndex+1}N' value='${nodes.findIndex(obj => obj === component.Node) + 1}'></input></td>
                            <td><input class="angle-input tables-input" type="number" min="0" max="45" value="${component.Angle}" id="RollerAngle${rollerIndex+1}"></td>
                            <td></td>`;
                            document.getElementById('component-values-table').appendChild(row);
                            document.getElementById(`roller${rollerIndex+1}N`).style.backgroundColor = colours[nodeColourIndex[nodes.findIndex(obj => obj === component.Node)]];
            rollerIndex++;

        } else if(component.Type === 'fixed') {
            row.innerHTML = `<td class="component">Fixed support ${fixtureIndex+1}</td>
                            <td class="center-text"><input class="comp-node tables-input" id='fixture${fixtureIndex+1}N' value='${nodes.findIndex(obj => obj === component.Node) + 1}'></input></td>
                            <td><span class="FixedSupportAngle" id="FixtureAngle${fixtureIndex+1}">${component.Angle}</span></td>
                            <td></td>`;
                            document.getElementById('component-values-table').appendChild(row);
                            document.getElementById(`fixture${fixtureIndex+1}N`).style.backgroundColor = colours[nodeColourIndex[nodes.findIndex(obj => obj === component.Node)]];
            fixtureIndex++;
        }


        });

        
        // update the nodes, components, and elements arrays whenever an input changes
        document.querySelectorAll('.tables-input').forEach((inputElement) => {
            inputElement.addEventListener('change', () => {
                updateNodes();
                updateElements();
                updateComponents()
                updateResultsTable();
                initializeGUI();

            });
        });

//upate the elements, components, nodes, and materials arrays whenever an input changes
// document.querySelectorAll('input').forEach((inputElement) => {
//     inputElement.addEventListener('change', () => {
//       updateNodes();
//       updateElements();
//       updateComponents()
//       initializeGUI();
//     });
//   });
// document.querySelectorAll('select').forEach((selectElement) => {
//     selectElement.addEventListener('change', () => {
//         updateNodes();
//         updateElements();
//         updateComponents()
//         initializeGUI();
//     });
// });


}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/////////////////////////////////////////// add Node & Element Logic ////////////////////////////////////////////////////////////

function organizeColors(index) {
    let temp = colours[nodes.length]; // save the last color
    let main = colours[index]; // get the selected color
    colours[nodes.length] = main; // set the selected color to the last node
    colours[index] = temp; // swap the last color with the selected one
}

function createColorOptions(startIndex) {
    let colorOptions = '';
    let sI = startIndex;
    for (let i = 0; i < colours.length - sI; i++) {
        colorOptions += `<div class="new-node-color-option custom-option" id="newNodeColorOption" style="background-color: ${colours[startIndex]};"></div>`;
        startIndex++;
    }
    return colorOptions;
}

function createMaterialOptions(){
    let materialOptions = '<option class="node-option custom-option" value="0" style="background-color: rgb(57, 64, 65);" selected>Steel</option>';
    materials.forEach((mat, index) => {
        materialOptions += `<option class="node-option custom-option" value="${index}" style="background-color: ${mat.color};">${mat.id}</option>`;
    });
    return materialOptions;
}

function createNodeOptions(){
    let nodeOptions = ``
    nodes.forEach((node, index) => {
        nodeOptions += `<option class="node-option custom-option" id="nodeOption" value="${index}" style="background-color: ${colours[index]};">${index+1}</option>`;
    });
    return nodeOptions;
}

function findFixedSupportAngle(nodeIndex){
    let node = nodes[nodeIndex];
    if(node.x < 60 && node.y < 50){
        return 45;
    } else if(node.x > 60 && node.y < 50){
        return 90+45;
    } else if(node.x < 60 && node.y > 50){
        return 270+45;
    } else if(node.x > 60 && node.y > 50){
        return 180+45;
    }
}

function createDefinedMaterialsList(){
    let definedMaterialsList = `<div class="defined-materials-list-header">
    <p>Name</p> <p>Modulus of Elasticity</p> <p>Color</p>
    </div> <div class="defined-materials-list-body" id="definedMaterialListBody">`

    definedMaterialsList += `<div class="defined-materials-list-element" id="defined-materials-list-name">`
    materials.forEach((mat, index) => {
        definedMaterialsList += `<p class="definedMaterialEntry">${mat.id}</p>`
    });
    definedMaterialsList += `</div>`;

    definedMaterialsList += `<div class="defined-materials-list-element" id="defined-materials-list-el">`
    materials.forEach((mat, index) => {
        definedMaterialsList += `<p>${mat.El}</p>`;
    });
    definedMaterialsList += `</div>`;

    definedMaterialsList += `<div class="defined-materials-list-element" id="defined-materials-list-color">`
    materials.forEach((mat, index) => {
        definedMaterialsList += `
        <div class="material-list-color" style="background-color: ${mat.color}; min-width: 3rem; min-height: 1.25rem; border-radius: 50px;"></div>`;
    });
    definedMaterialsList += `</div> </div>`;

    return definedMaterialsList;
}


function addComponent(){
    document.getElementById('addComponentBtn').style.backgroundColor = getCSSVariableById('--selected-Caption-Button-Background');
    
    //remove the addMaterialDiv if its open
    try{
        document.getElementById('new-material-div').remove();
        document.getElementById('addMaterialBtn').style.backgroundColor = getCSSVariableById('--caption-button-colour');}
        catch(e){}

    //remove the addNodeDiv if its open
    try{document.getElementById('new-node-div').remove();
    document.getElementById('addNodeBtn').style.backgroundColor = getCSSVariableById('--caption-button-colour');}
    catch(e){}
    

    //remove the addElementDiv if its open
    try{document.getElementById('new-element-div').remove();
    document.getElementById('addElementBtn').style.backgroundColor = getCSSVariableById('--caption-button-colour')}
    catch(e){}
    
    if (document.getElementById('new-component-div') == null) {
    
    let addAComponent = document.createElement('div'); 

    let addAComponentRow1 = document.createElement('div'); 
    let addAComponentRow2 = document.createElement('div'); 

    let addAComponentRow1Title = document.createElement('div'); 
    let addAComponentRow2Title = document.createElement('div'); 
    
    let addAComponentRow1Input = document.createElement('div'); 
    let addAComponentRow2Input = document.createElement('div'); 

    let addAComponentRow1Footer = document.createElement('div'); 
    let addAComponentRow2Footer = document.createElement('div'); 

    addAComponent.setAttribute('class', 'new-component-div');
    addAComponent.setAttribute('id', 'new-component-div');

    addAComponentRow1Title.setAttribute('class', 'new-component-div-Title');
    addAComponentRow2Title.setAttribute('class', 'new-component-div-Title');

    addAComponentRow1Input.setAttribute('class', 'new-component-div-Input');
    addAComponentRow2Input.setAttribute('class', 'new-component-div-Input');
    
    addAComponentRow1Footer.setAttribute('class', 'new-component-div-Footer');
    addAComponentRow2Footer.setAttribute('class', 'new-component-div-Footer');
    
    addAComponent.appendChild(addAComponentRow1)
    addAComponent.appendChild(addAComponentRow2)

    addAComponentRow1.appendChild(addAComponentRow1Title)
    addAComponentRow2.appendChild(addAComponentRow2Title)

    addAComponentRow1.appendChild(addAComponentRow1Input)
    addAComponentRow2.appendChild(addAComponentRow2Input)

    addAComponentRow1.appendChild(addAComponentRow1Footer)
    addAComponentRow2.appendChild(addAComponentRow2Footer)

    addAComponentRow1Title.innerHTML = '<div id="new-force-title">Add A Force</div>';
    addAComponentRow2Title.innerHTML = '<div id="new-fixture-title">Add A Fixture</div>';

    const newForceFormInnerHTML =  `
    <form id="new-force-form">
        <div class="new-force-input-container"> 
            <p class="new-force-input-label">Magnitude: </p>
            <input type="number" id="newForceMagnitude" class="new-fixture-input" value="" required/>
        </div>
        <div class="new-force-input-container"> 
            <p class="new-force-input-label">Angle: </p>
            <input type="number" id="newForceAngle" class="new-fixture-input" value="" required/>
        </div>
        <div class="new-force-input-container">
            <label  class="new-force-input-label"> At node: </label>
            <select id="newForceNodeSelection" class="new-fixture-dropdown">
                <option value="-1" selected>Select a Node</option>
                ${createNodeOptions()}
            </select>
        </div>
        <div class="new-force-submit-container">
        <button value="submit" type="submit" id="addNewForceSubmit">Add Force</button>
        </div>
    </form>
                                `

    const newComponentFormInnerHTML = `
            <form id="new-fixture-form">
                <div class="new-fixture-input-container">
                    <label class="new-fixture-dropdown-label">Type: </label>
                    <select id="newFixtureSelect" class="new-fixture-dropdown">
                        <option value="roller" selected>Roller support</option>
                        <option value="fixed">Fixed support</option>
                    </select>
                </div>
                <div class="new-fixture-input-container">
                    <p class="new-fixture-input-label">At node: </p>
                    <select id="newFixtureNodeSelection" class="new-fixture-dropdown">
                        <option value="-1" selected>Select a Node</option>
                        ${createNodeOptions()}
                    </select>
                </div>
                <div class="new-fixture-input-container">
                    <p class="new-fixture-input-label">Angle: </p>
                    <input type="number" id="newFixtureAngle" class="new-fixture-input" value="" required/>
                </div>
                <div class="new-fixture-submit-container" id="newFixtureErrorContainer" style="display:flex; justify-content: center; gap: 1rem; flex-wrap: wrap;">     
                <button value="submit" type="submit" id="addNewFixtureSubmit">Add Fixture</button>

                </div>
            </form> `

        addAComponentRow1Input.innerHTML = newForceFormInnerHTML;
        addAComponentRow2Input.innerHTML = newComponentFormInnerHTML;


        document.getElementById('figure1').appendChild(addAComponent)

            //now take that input and update the arrays and the GUI;
        document.getElementById('new-force-form').addEventListener('submit', function (e) {
            e.preventDefault();
            if (parseInt(document.getElementById('newForceNodeSelection').value) != -1) {
                let magnitude = parseFloat(document.getElementById('newForceMagnitude').value);
                let angle = parseFloat(document.getElementById('newForceAngle').value);
                let nodeIndex = parseInt(document.getElementById('newForceNodeSelection').value);

                let newForceComp = new Force(nodes[nodeIndex], angle, magnitude);

                let lastForceIndex = components.findLastIndex(component => component instanceof Force);
                components.splice(lastForceIndex + 1, 0, newForceComp);

                initializeGUI();
                updateComponents();
                initializeGUI();

                document.getElementById('new-force-form').reset();

            } else { alert("Please select a node") }
        });

        document.getElementById('new-fixture-form').addEventListener('submit', function (e) {
            e.preventDefault();
            if (parseInt(document.getElementById('newFixtureNodeSelection').value) != -1) {
                let fixtureType = document.getElementById('newFixtureSelect').value;
                let nodeIndex = parseInt(document.getElementById('newFixtureNodeSelection').value);
                let angle;
                if (fixtureType == "roller"){
                    angle = parseFloat(document.getElementById('newFixtureAngle').value);
                } else {angle = findFixedSupportAngle(nodeIndex);}

                let isConfilicting = false;

                components.forEach((component, index) => {
                    if (component instanceof Fixture){
                        if (nodes.indexOf(component.Node) == nodeIndex){
                            isConfilicting = true;
                            
                            let errorText = `<p id="newFixtureAlert" style="color:red; border:none; background-color:transparent; margin-bottom: -1rem;">Fixture already Has a node</p>
                            <p id="newFixtureAlert-option1" >cancel</p>
                            <p id="newFixtureAlert-option2">replace</p>`

                            document.getElementById('addNewFixtureSubmit').remove();
                            document.getElementById('newFixtureErrorContainer').style.marginTop = '-1rem';
                            document.getElementById('newFixtureErrorContainer').innerHTML += errorText;

                            document.getElementById('newFixtureAlert-option1').addEventListener( 'click', (option) => {
                                    document.getElementById('newFixtureErrorContainer').style.marginTop = '0';
                                    document.getElementById('newFixtureErrorContainer').innerHTML =`<button value="submit" type="submit" id="addNewFixtureSubmit">Add Fixture</button>`;
                                    document.getElementById('new-fixture-form').reset();
                                }) 
                            
                            document.getElementById('newFixtureAlert-option2').addEventListener( 'click', (option) => {

                                        let newFixtureComp = new Fixture(nodes[nodeIndex], angle, fixtureType);

                                        if (fixtureType == "roller") {
                                            components[index] = newFixtureComp;

                                        }
                                        else {
                                            components[index]= newFixtureComp;

                                            // components.pop();
                                            // components.push(newFixtureComp);
                                        }

                                        initializeGUI();
                                        updateComponents();
                                        initializeGUI();
                                        document.getElementById('newFixtureErrorContainer').style.marginTop = '0';
                                        document.getElementById('newFixtureErrorContainer').innerHTML =`<button value="submit" type="submit" id="addNewFixtureSubmit">Add Fixture</button>`;
                                        document.getElementById('new-fixture-form').reset();
                                }) 
                        }
                    }
                });

                if(!isConfilicting){

                let newFixtureComp = new Fixture(nodes[nodeIndex], angle, fixtureType);

                if(fixtureType == "roller"){
                    let lastRollerIndex = components.findLastIndex(component => component.Type === "roller");
                    components.splice(lastRollerIndex + 1, 0, newFixtureComp);}
                else{
                components.push(newFixtureComp);}

                initializeGUI();
                updateComponents();
                initializeGUI();

                document.getElementById('new-fixture-form').reset();

                }

            } else { alert("Please select a node") }
            
        });

    } else {
        document.getElementById('new-component-div').remove();   
        document.getElementById('addComponentBtn').style.backgroundColor = getCSSVariableById('--caption-button-colour');
    }

}

function addNode() {

    //remove the addMaterialDiv if its open
    try{
        document.getElementById('new-material-div').remove();
        document.getElementById('addMaterialBtn').style.backgroundColor = getCSSVariableById('--caption-button-colour');}
        catch(e){}

    //remove the addComponentDiv if its open
    try{
    document.getElementById('new-component-div').remove();
    document.getElementById('addComponentBtn').style.backgroundColor = getCSSVariableById('--caption-button-colour');}
    catch(e){}

    //remove the addElementDiv if its open
    try{document.getElementById('new-element-div').remove();
        document.getElementById('addElementBtn').style.backgroundColor = getCSSVariableById('--caption-button-colour')}
    catch(e){}


    if (document.getElementById('new-node-div') == null) {
        document.getElementById('addNodeBtn').style.backgroundColor = getCSSVariableById('--selected-Caption-Button-Background');
        let nodeNum = nodes.length;
        const inputDiv = document.createElement('div');
        inputDiv.id = 'new-node-div';
        inputDiv.className = 'new-node-div';
        inputDiv.innerHTML = `<form id="newNodeForm">
                    <div class="new-node-div-input-containers">
                        <div class="new-node-div-coordinate-input-container">
                            <label class="new-node-coordinate-div-label">New Node # ${nodeNum + 1}</label>
                            <span class="new-node-coordinate-input-label"><p class="new-node-input-label">x-coordinate: </p><input type="number" id="newNodeX" class="new-node-coordinate-input" value="" required/></span>
                            <span class="new-node-coordinate-input-label"><p class="new-node-input-label">y-coordinate: </p><input type="number" id="newNodeY" class="new-node-coordinate-input" value="" required/></span>
                            <div class="custom-select new-node-color-selection">
                                <span class="new-node-coordinate-input-label"><p class="new-node-input-label">Node color: </p><div class="select-selected selected-new-node-color-option">Select an option ˅</div>
                                <div class="select-items">
                                    <div class="new-node-color-option custom-option" id="randomColorOption" style="background-color: black; color: white;">Black</div>
                                    ${createColorOptions(nodeNum)}
                                </div>
                            </div><span class="new-node-coordinate-input-label">
                        </div>
                        <div class="horizontal-line-divider"></div>
                            <div class="new-node-element-connection-container">
                                <label class="new-node-element-connection-div-label">Element-connection</label>
                                <select id="element-connection-dropdown" class='element-connection-dropdown' name="dropdown">
                                    <option value="new" >New element</option>
                                    <option value="split" selected>Split element</option>
                                </select>
                        </div>
                    </div>
                    <div class="new-node-div-submit-button-container">
                        <button value="submit" type="submit" id="addNewNodeSubmit">Add Node</button>
                        <p id="new-node-input-error" style="color:red;"></p>
                    </div></form>`;

        document.getElementById('figure1').appendChild(inputDiv);
        colordropdownEventHandler();
        // NewElementInputSelection();
        splitElementInputSelection();

        document.getElementById('element-connection-dropdown').addEventListener('change', () => {
            if(document.getElementById('element-connection-dropdown').value ==='new'){
                NewElementInputSelection();
            } else {
                splitElementInputSelection();;
            }
        });
        
        function NewElementInputSelection(){

            
            try{document.getElementById('spanfrom').remove()}catch(e){}
            try{document.getElementById('spanto').remove()}catch(e){}
            try{document.getElementById('spam').remove()}catch(e){}
            try{document.getElementById('spanCSfrom').remove()}catch(e){}
            try{document.getElementById('spanCSto').remove()}catch(e){}


            const spanfrom = document.createElement('span');
            const spanto = document.createElement('span');

            const spanCSfrom = document.createElement('span');
            const spanCSto = document.createElement('span');

            spanto.textContent = 'To Node:';
            spanto.id = 'spanto'
            spanto.style.display = 'flex';
            spanto.style.width = '20rem';
            spanto.style.width = '20rem';
            spanto.style.justifyContent = 'flex-end';
            spanto.style.gap = '0.5rem';
            spanto.style.paddingInline = '1rem';
            spanto.style.alignItems= 'center';

            spanfrom.id = 'spanfrom'     
            spanfrom.textContent = 'From Node:';
            spanfrom.style.display = 'flex';    
            spanfrom.style.width = '20rem';                   
            spanfrom.style.justifyContent = 'flex-end';   
            spanfrom.style.gap = '0.5rem';
            spanfrom.style.paddingInline = '1rem';
            spanfrom.style.alignItems = 'center';


            spanCSfrom.id = 'spanCSfrom'     
            spanCSfrom.textContent = 'Cross Section 1:';
            spanCSfrom.style.display = 'flex';    
            spanCSfrom.style.width = '20rem';                   
            spanCSfrom.style.justifyContent = 'flex-end';   
            spanCSfrom.style.gap = '0.5rem';
            spanCSfrom.style.paddingInline = '1rem';
            spanCSfrom.style.alignItems = 'center';

            spanCSto.id = 'spanCSto'     
            spanCSto.textContent = 'Cross Section 2:';
            spanCSto.style.display = 'flex';    
            spanCSto.style.width = '20rem';                  
            spanCSto.style.justifyContent = 'flex-end';   
            spanCSto.style.gap = '0.5rem';
            spanCSto.style.paddingInline = '1rem';
            spanCSto.style.alignItems = 'center';
            

            const nodeTo = document.createElement('input');
            const nodefrom = document.createElement('input');

            const CSfrom = document.createElement('input');
            const CSTo= document.createElement('input');
            

            nodeTo.setAttribute('class', 'new-node-coordinate-input');
            nodeTo.setAttribute('type', 'number');
            nodeTo.setAttribute('id', 'nodeTo');
            nodeTo.setAttribute('placeholder', 'node #');
            nodeTo.setAttribute('min', '1');
            nodeTo.setAttribute('max', `${nodes.length}`);
            nodeTo.required = true;
            nodeTo.style.width = '5rem';

            nodefrom.setAttribute('class', 'new-node-coordinate-input');            
            nodefrom.setAttribute('type', 'number');          
            nodefrom.setAttribute('id', 'nodefrom');            
            nodefrom.setAttribute('placeholder', 'node #');            
            nodefrom.setAttribute('min', '1');
            nodefrom.setAttribute('max', `${nodes.length}`);                                    
            nodefrom.required = true;            
            nodefrom.style.width = '5rem';

            CSTo.setAttribute('class', 'new-node-coordinate-input');
            CSTo.setAttribute('type', 'number');
            CSTo.setAttribute('id', 'CSTo');
            // CSTo.setAttribute('placeholder', '');
            CSTo.setAttribute('min', '0.0001');
            CSTo.setAttribute('step', '0.0001');
            // CSTo.setAttribute('max', `${nodes.length}`);
            CSTo.required = true;
            CSTo.style.width = '8rem';
            
            CSfrom.setAttribute('class', 'new-node-coordinate-input'); 
            CSfrom.setAttribute('type', 'number');          
            CSfrom.setAttribute('id', 'CSfrom');            
            // CSfrom.setAttribute('placeholder', '');            
            CSfrom.setAttribute('min', '0.0001');
            CSfrom.setAttribute('step', '0.0001');
            // CSfrom.setAttribute('max', `${nodes.length}`);             
            CSfrom.required = true;            
            CSfrom.style.width = '8rem';

            spanfrom.appendChild(nodefrom);
            spanCSfrom.appendChild(CSfrom);
            spanto.appendChild(nodeTo);
            spanCSto.appendChild(CSTo);

            const materialList1 = document.createElement('select');
            materialList1.setAttribute('id','materialList1');
            // materialList1.setAttribute('class', 'element-connection-dropdown')
            materialList1.style.width = '6rem';
            materialList1.style.backgroundColor = 'rgb(57, 64, 65)';
            materialList1.style.color = 'white';
            materialList1.required = true;


            const materialList2 = document.createElement('select');
            materialList2.setAttribute('id','materialList2');
            // materialList2.setAttribute('class', 'element-connection-dropdown')
            materialList2.style.width = '6rem';
            materialList2.style.backgroundColor = 'rgb(57, 64, 65)';
            materialList2.style.color = 'white';
            materialList2.required = true;

            materials.forEach((mat) => {
                const option1 = document.createElement('option');
                const option2 = document.createElement('option');
                option1.value = mat.id;
                option1.textContent = mat.id;
                option1.style.backgroundColor = mat.color;
                option2.value = mat.id;
                option2.textContent = mat.id;
                option2.style.backgroundColor = mat.color;
                if(mat.id=="steel"){ option1.selected = true; option2.selected = true;}
                materialList1.appendChild(option1);
                materialList2.appendChild(option2);
            });

            spanfrom.appendChild(materialList1)
            spanto.appendChild(materialList2)
            

            document.querySelector('.new-node-element-connection-container').appendChild(spanfrom);
            document.querySelector('.new-node-element-connection-container').appendChild(spanCSfrom);
            document.querySelector('.new-node-element-connection-container').appendChild(spanto);
            document.querySelector('.new-node-element-connection-container').appendChild(spanCSto);
        }

        function splitElementInputSelection(){

            try{document.getElementById('spanfrom').remove()}catch(e){}
            try{document.getElementById('spanto').remove()}catch(e){}
            try{document.getElementById('spam').remove()}catch(e){}
            try{document.getElementById('spanCSfrom').remove()}catch(e){}
            try{document.getElementById('spanCSto').remove()}catch(e){}
            

            const spam = document.createElement('span');
            spam.id = 'spam'
            spam.textContent = 'Select the element to split: ';
            spam.style.display = 'flex';
            spam.style.flexDirection = 'column';
            spam.style.width = '20rem';
            spam.style.justifyContent = 'center';
            spam.style.gap = '0.5rem';
            spam.style.paddingInline = '1rem';
            spam.style.alignItems= 'center';
            spam.style.textAlign= 'center';
            spam.style.fontSize= '1.125rem';
        

            const elementList = document.createElement('select');
            elementList.setAttribute('id','elementalist');
            elementList.setAttribute('class','new-node-coordinate-input');
            elementList.style.width = '8rem';
            elementList.style.fontSize = '1rem';
            elementList.required = 'true';

            elements.forEach((element, index) => {
                const option1 = document.createElement('option');
                option1.value = `${index}`;
                option1.textContent = `Bar ${index + 1}`;
                elementList.appendChild(option1);
            });

            spam.appendChild(elementList);

            document.querySelector('.new-node-element-connection-container').appendChild(spam);

        }

        document.getElementById('newNodeForm').addEventListener('submit', (e) => {

            e.preventDefault();

            const selectedColorOption = document.querySelector('.selected-new-node-color-option');
            
            if (selectedColorOption.style.backgroundColor != '') {
                let x = parseFloat(document.getElementById('newNodeX').value);
                let y = parseFloat(document.getElementById('newNodeY').value);
                let colorid = selectedColorOption.style.backgroundColor;
                let colorIndex = colours.findIndex(color => color === colorid);

                if (colorIndex !== -1) {
                    organizeColors(colorIndex);
                    let newNode = new Node(x, y);
                    nodes.push(newNode);

                    if (document.getElementById('element-connection-dropdown').value === 'new') {
                        let nodefromIndex = parseFloat(document.getElementById('nodefrom').value) - 1;
                        let nodeToIndex   = parseFloat(document.getElementById('nodeTo').value) - 1;

                        let material1Id = document.getElementById(`materialList1`).value;
                        let material2Id = document.getElementById(`materialList2`).value;

                        let crossSection1 = parseFloat(document.getElementById(`CSfrom`).value);
                        let crossSection2 = parseFloat(document.getElementById(`CSTo`).value);

                        let newEle1 = new Element(nodes[nodefromIndex],newNode, materials[materials.findIndex(materials => materials.id == material1Id)], crossSection1);
                        let newEle2 = new Element(newNode, nodes[nodeToIndex], materials[materials.findIndex(materials => materials.id == material2Id)], crossSection2);

                        elements.push(newEle1);
                        elements.push(newEle2);

                    } else {
                        let elementSplitIndex = parseFloat(document.getElementById('elementalist').value);
                        let elementToSplit = elements[elementSplitIndex];
                        let tempfinalNode = elementToSplit.Nf;
                        elements[elementSplitIndex].Nf = newNode;
                        let newElement = new Element(tempfinalNode, newNode, elementToSplit.Material, elementToSplit.Ar);
                        elements.push(newElement);
                        initializeGUI();
                        updateElements();
                    }
                    initializeGUI();

                }

                document.getElementById('new-node-div').remove();
                document.getElementById('addNodeBtn').style.backgroundColor = getCSSVariableById('--caption-button-colour');

            } else {document.getElementById('new-node-input-error').innerText = 'please select a color'}
        });

    } else {
        document.getElementById('new-node-div').remove();
        document.getElementById('addNodeBtn').style.backgroundColor = getCSSVariableById('--caption-button-colour');
    }
}

function addElement(){

    document.getElementById('addElementBtn').style.backgroundColor = getCSSVariableById('--selected-Caption-Button-Background');
    
    //remove the addNodeDiv if its open
    try{document.getElementById('new-node-div').remove();
        document.getElementById('addNodeBtn').style.backgroundColor = getCSSVariableById('--caption-button-colour');}
        catch(e){}
    
    //remove the addComponentDiv if its open
    try{
        document.getElementById('new-component-div').remove();
        document.getElementById('addComponentBtn').style.backgroundColor = getCSSVariableById('--caption-button-colour');}
        catch(e){}

    //remove the addMaterialDiv if its open
    try{
        document.getElementById('new-material-div').remove();
        document.getElementById('addMaterialBtn').style.backgroundColor = getCSSVariableById('--caption-button-colour');}
        catch(e){}



    
    
    if (document.getElementById('new-element-div') == null) {

    let addAComponent = document.createElement('div'); 
    let addAComponentRow1 = document.createElement('div');
    let addAComponentRow1Title = document.createElement('div'); 
    let addAComponentRow1Input = document.createElement('div'); 
    let addAComponentRow1Footer = document.createElement('div'); 

    addAComponent.setAttribute('class', 'new-component-div new-element-div');
    addAComponent.setAttribute('id', 'new-element-div');

    addAComponentRow1Title.setAttribute('class', 'new-component-div-Title');
    addAComponentRow1Input.setAttribute('class', 'new-component-div-Input');
    addAComponentRow1Footer.setAttribute('class', 'new-component-div-Footer');
    
    addAComponent.appendChild(addAComponentRow1)
    addAComponentRow1.appendChild(addAComponentRow1Title)
    addAComponentRow1.appendChild(addAComponentRow1Input)
    addAComponentRow1.appendChild(addAComponentRow1Footer)

    addAComponentRow1Title.innerHTML = '<div id="new-element-title">Add An Element</div>';

    const newForceFormInnerHTML =  `
    <form id="new-Element-form">
         <div class="new-force-input-container">
            <label  class="new-force-input-label">From node: </label>
            <select id="newElementNode1Selection" class="new-fixture-dropdown">
                <option value="-1" selected>Select a Node</option>
                ${createNodeOptions()}
            </select>
        </div>
        <div class="new-force-input-container">
            <label  class="new-force-input-label">To node: </label>
            <select id="newElementNode2Selection" class="new-fixture-dropdown">
                <option value="-1" selected>Select a Node</option>
                ${createNodeOptions()}
            </select>
        </div>
        <div class="new-force-input-container"> 
            <p class="new-force-input-label">Cross Section: </p>
            <select id="newElementMaterialSelection" class="new-element-materials-dropdown">
                ${createMaterialOptions()}
            </select>
        </div>
        <div class="new-force-input-container"> 
            <p class="new-force-input-label">Cross Section: </p>
                <input type="number" id="newElementCS" step=".0001" class="new-fixture-input" value="" required/>
        </div>
        <div class="new-force-submit-container new-element-submit-container">
            <button value="submit" type="submit" id="addNewElementSubmit">Add Element</button>
        </div>
    </form>                                `

        addAComponentRow1Input.innerHTML = newForceFormInnerHTML; 

        document.getElementById('figure1').appendChild(addAComponent);

        //now take that input and update the arrays and the GUI;
        document.getElementById('new-Element-form').addEventListener('submit', function(e) {        
            e.preventDefault();
                if(parseInt(document.getElementById('newElementNode1Selection').value) != -1 && parseInt(document.getElementById('newElementNode2Selection').value) != -1){

                    let nodeiIndex = parseInt(document.getElementById('newElementNode1Selection').value);
                    let nodefIndex = parseInt(document.getElementById('newElementNode2Selection').value);
                    let crossSection = parseFloat(document.getElementById('newElementCS').value);
                    let materialIndex = parseInt(document.getElementById('newElementMaterialSelection').value);

                    let newElementComp = new Element(nodes[nodeiIndex], nodes[nodefIndex], materials[materialIndex], crossSection);

                    elements.push(newElementComp);
                
                    initializeGUI();
                    updateElements();
                    initializeGUI();

                    document.getElementById('new-Element-form').reset();
                    document.getElementById('addElementNodeBtn').style.backgroundColor = getCSSVariableById('--caption-button-colour');

            } else { 
                if(parseInt(document.getElementById('newElementNode1Selection').value) == -1 && parseInt(document.getElementById('newElementNode2Selection').value) == -1){alert("Please select a starting and ending node for this element and try again")};
                if(parseInt(document.getElementById('newElementNode1Selection').value) == -1){alert("Please select a starting node and try again ")};
                if(parseInt(document.getElementById('newElementNode2Selection').value) == -1){alert("please select an ending node and try again ")};
            }
        });

    } else{
        document.getElementById('new-element-div').remove();
        document.getElementById('addElementBtn').style.backgroundColor = getCSSVariableById('--caption-button-colour');
    }
}

function addMaterial(){
    document.getElementById('addMaterialBtn').style.backgroundColor = getCSSVariableById('--selected-Caption-Button-Background');
    
    
    //remove the addNodeDiv if its open
    try{document.getElementById('new-node-div').remove();
        document.getElementById('addNodeBtn').style.backgroundColor = getCSSVariableById('--caption-button-colour');}
        catch(e){}
    
    //remove the addComponentDiv if its open
    try{
        document.getElementById('new-component-div').remove();
        document.getElementById('addComponentBtn').style.backgroundColor = getCSSVariableById('--caption-button-colour');}
        catch(e){}

   
    //remove the addElementDiv if its open
    try{document.getElementById('new-element-div').remove();
        document.getElementById('addElementBtn').style.backgroundColor = getCSSVariableById('--caption-button-colour')}
    catch(e){}

    
    if (document.getElementById('new-material-div') == null) {

    let addAMaterialDiv = document.createElement('div'); 

    let addAMaterialTitle = document.createElement('div');
    let addAMaterialDefined = document.createElement('div');
    let addAMaterialSelection = document.createElement('div');

    addAMaterialDiv.setAttribute('class', 'new-material-div');
    addAMaterialDiv.setAttribute('id', 'new-material-div');

    addAMaterialDiv.appendChild(addAMaterialTitle);
    addAMaterialDiv.appendChild(addAMaterialDefined);
    addAMaterialDiv.appendChild(addAMaterialSelection);


    addAMaterialTitle.innerHTML = '<div id="new-material-title">Defined Materials</div>';

    addAMaterialDefined.innerHTML = createDefinedMaterialsList();

    addAMaterialSelection.innerHTML = `
     <div class="addAMaterialSelection-input-container" id="addAMaterialSelection-input-container">
            <p  class="addAMaterialSelection-input" id="defineNewMaterialInput">Define A New Material </p>
            <p  class="addAMaterialSelection-input" id="addPreDefinedMaterialInput">Add a Pre-Defined Material </p>
        </div>`

    const DefineNewMaterialInnerHtml =  `
    <div id="new-Material-form" styles="display:block;">
        <div class="new-force-submit-container new-element-submit-container">
            <button value="submit" id="addNewMaterialSubmit">Add Material</button>
        </div>
    </div>`

    document.getElementById('figure1').appendChild(addAMaterialDiv);

    document.getElementById('addAMaterialSelection-input-container').innerHTML = ` <p  class="addAMaterialSelection-input" id="defineNewMaterialInput">Define A New Material </p>`;

    document.getElementById('defineNewMaterialInput').addEventListener('click', () => {

        // try{document.getElementById("defined-materials-list-name").display = 'none';}catch(e){}

        document.getElementById("defineNewMaterialInput").style.display = 'none';
        
        // document.getElementById('addAMaterialSelection-input-container').innerHTML = ` <p  class="addAMaterialSelection-input" id="defineNewMaterialInput">Define A New Material </p>`;
        document.getElementById('addAMaterialSelection-input-container').outerHTML += DefineNewMaterialInnerHtml;
        document.getElementById('addAMaterialSelection-input-container').parentElement.style = 'display:flex;flex-direction:column-reverse;';
            // addAMaterialDiv.style.display = none;
            document.getElementById('defined-materials-list-name').innerHTML += `<input class="defineNewMaterialInputElement" id="defineNewMaterialName" type="text" placeholder="Name"/>`
            document.getElementById('defined-materials-list-el').innerHTML +=`<input class="defineNewMaterialInputElement" id="defineNewMaterialEl" type="number" placeholder="Elasticity"/>`
            document.getElementById('defined-materials-list-color').innerHTML += `<input style=" border: none; background-color: transparent; min-width: 3rem; min-height: 1.25rem; border-radius: 50px;" id="defineNewMaterialColor" type="color" value="#B86F32"/>`

            // document.getElementById('definedMaterialListBody').innerHTML += DefineNewMaterialInnerHtml;
        
            document.getElementById('addNewMaterialSubmit').addEventListener('click', (e) => {
                e.preventDefault();
                let newMatId    = document.getElementById('defineNewMaterialName')
                let newMatEl    = parseInt(document.getElementById('defineNewMaterialEl').value)
                let newMatColor = document.getElementById('defineNewMaterialColor')
                
                if (newMatId != ''  && newMatEl > 0){
                
                materials.push({id : newMatId.value, El: newMatEl, color: newMatColor.value});

                addAMaterialDefined.innerHTML = createDefinedMaterialsList();
                initializeGUI();
                try{
                    document.getElementById('new-material-div').remove();
                        document.getElementById('addMaterialBtn').style.backgroundColor = getCSSVariableById('--caption-button-colour');}
                catch(e){}
                    addMaterial();
                
                
                }else{
                    alert("Fill in all fields correctly next time...");
                }

                console.log(materials);
                // document.getElementById("defineNewMaterialInput").style.display = '';
                // document.getElementById('new-Material-form').remove();
                // document.getElementById('defineNewMaterialName').remove();
                // document.getElementById('defineNewMaterialEl').remove();
                // document.getElementById('defineNewMaterialColor').remove();

                //remove the addMaterialDiv if its open
                    try{
                        document.getElementById('new-material-div').remove();
                            document.getElementById('addMaterialBtn').style.backgroundColor = getCSSVariableById('--caption-button-colour');}
                    catch(e){}
                        addMaterial();
            })

            


        })
        //now take that input and update the arrays and the GUI;
     

    } else{
        document.getElementById('new-material-div').remove();
        document.getElementById('addMaterialBtn').style.backgroundColor = getCSSVariableById('--caption-button-colour');

        
    }


}

// document.addEventListener("DOMContentLoaded", () => {addComponent();});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/////////////////////////////////////////// Update nodes, elements, and containers Array /////////////////////////////////////////

function updateNodes() {
    
    nodes = nodes.map((node, index) => ({
        x: parseFloat(document.getElementById(`x${index+1}`).value),
        y: parseFloat(document.getElementById(`y${index+1}`).value)
    }));

}

function updateElements() {

    let numOfElements = document.querySelectorAll('.node-connectivity-td');

    for(let i = 0; i < numOfElements.length; i++) {
    elements[i] = new Element(nodes[parseFloat(document.getElementById(`E${i+1}Ni`).value)-1], 
                              nodes[parseFloat(document.getElementById(`E${i+1}Nf`).value)-1],
                              materials[document.getElementById(`material-dropdown-${i+1}`).value],
                              parseFloat(document.getElementById(`E${i+1}A`).value))
    }

}

function updateComponents() {

    let ComponentsNodeList = document.querySelectorAll('.component');

    let forceIndex = 0;
    let fixtureIndex = 0;
    let rollerIndex = 0;

    ComponentsNodeList.forEach((comp, index) => {

        if(ComponentsNodeList[index].textContent.split(' ',2)[0] === 'Force') {
            // console.log(ComponentsNodeList[index].textContent.split(' ',2)[0]);
            components[index] = new Force(nodes[parseFloat(document.getElementById(`force${forceIndex+1}N`).value)-1],
                                                parseFloat(document.getElementById(`ForceAngle${forceIndex+1}`).value),
                                                parseFloat(document.getElementById(`ForceValue${forceIndex+1}`).value))
            forceIndex++;
        } else if( ComponentsNodeList[index].textContent.split(' ',3)[0] === 'Roller') {
            components[index] = new Fixture(nodes[parseFloat(document.getElementById(`roller${rollerIndex+1}N`).value)-1],
                                            parseFloat(document.getElementById(`RollerAngle${rollerIndex+1}`).value),
                                            'roller')
            rollerIndex++;
        } else {
            components[index] = new Fixture(nodes[parseFloat(document.getElementById(`fixture${fixtureIndex+1}N`).value)-1],
                                            parseFloat(document.getElementById(`FixtureAngle${fixtureIndex+1}`).innerText),
                                            'fixed')
            fixtureIndex++;
        }

        });

}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/////////////////////////////////////////// move the nodes around with mouse ///////////////////////////////////////////

let selectedNode = null; // To track which node is being dragged
let dragSpeedFactor= 1;
// let dragSpeedFactor= 0.75;
let offsetX, offsetY; // To store the offset between the mouse click and the node position

function dragNode(event) {
    if (selectedNode !== null) {

        

        // Instead of directly applying the new position, calculate the movement in small increments
        const currentNode = nodes[selectedNode];
        
        var CTM = document.getElementById("savage").getScreenCTM();

        if (event.touches) { event = event.touches[0]; }

        var  targetX = (event.clientX - CTM.e) / CTM.a
        var  targetY = (event.clientY - CTM.f) / CTM.d

        // Get the target position based on the mouse's movement
        // while ((event.clientX - offsetX - currentNode.x) < 5){
        // const targetX = event.clientX/4 - offsetX;
        // const targetY = event.clientY/3 - offsetY;
        // }

        // If the mouse has moved outside the SVG area, prevent the node from being dragged beyond the boundaries
        if (targetX < 0) targetX = 0;
        if (targetX > 140) targetX = 140;
        if (targetY < -20) targetY = -20;
        if (targetY > 100) targetY = 100;

        
        // Smoothly update the node's position by only moving a fraction of the distance to the target
        currentNode.x += Math.round(((targetX - currentNode.x) * dragSpeedFactor )/5 ) *5;
        currentNode.y += Math.round(((100 - targetY - currentNode.y) * dragSpeedFactor)/5 ) * 5; // Adjust for SVG coordinate system
        
        // Update the SVG node circle position
        // const nodeCircle = document.getElementById(`node${selectedNode + 1}circle`);

        // nodeCircle.setAttribute('cx', currentNode.x);
        // nodeCircle.setAttribute('cy', 100 - currentNode.y);
        

        // Redraw the elements since the nodes have moved
        // updateResultsTable() //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // initializeGUI();
        updateElements();
        updateComponents()
        initializeGUI();
        keepNodeSelected(selectedNodeIndex)

    }
}

function stopDragging() {
    // Stop dragging once the mouse is released
    selectedNode = null;
    document.removeEventListener('mousemove', dragNode);
    document.removeEventListener('mouseup', stopDragging);

    updateResultsTable();
    initializeGUI();
    updateNodes();
    updateElements();
    updateComponents()
    initializeGUI();
    keepNodeSelected(selectedNodeIndex);
    // unSelectNode(selectedNodeIndex)
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/////////////////////////////////////////// move the nodes around with keyboard /////////////////////////////////////////

let selectedNodeIndex = null;

// Function to handle node selection
function selectNode(index, circle) {
    document.querySelectorAll('.nodeSvg').forEach((node, index) => {
        node.classList.remove('activeNode');
    });

    // Add the 'selectedNode' class to the clicked node
    circle.classList.add('activeNode');

    selectedNodeIndex = index;

    return index;
}

function keepNodeSelected(index) {
    document.querySelectorAll('.nodeSvg')[index].classList.add('activeNode');
};

function unSelectNode(index) {
    try{document.querySelectorAll('.nodeSvg')[index].classList.remove('activeNode');}catch(e){}
};

document.addEventListener("keydown", (event) => {
    if (selectedNodeIndex != null) {
        const key = event.key;

        if (key === "w" || key === "W") {
            nodes[selectedNodeIndex].y += 5;
        } else if (key === "s" || key === "S") {
            nodes[selectedNodeIndex].y -= 5;
        } else if (key === "a" || key === "A") {
            nodes[selectedNodeIndex].x -= 5;
        } else if (key === "d" || key === "D") {
            nodes[selectedNodeIndex].x += 5;
        }

        initializeGUI();
        updateNodes();
        updateElements();
        updateComponents()
        initializeGUI();

        keepNodeSelected(selectedNodeIndex)

    }
});

document.querySelectorAll('.body-section').forEach((tag) => {
tag.addEventListener('click', () => {
    unSelectNode(selectedNodeIndex);
    selectedNodeIndex = null;
});
});

document.querySelectorAll('body > *:not(svg)').forEach((tag) => {
tag.addEventListener('click', () => {
    unSelectNode(selectedNodeIndex);
    selectedNodeIndex = null;
});
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////// Update Results Table //////////////////////////////////////////////////////////////////

function updateGlobalEquation(){

    let stiffnessMatrix = createStiffnessMatrix();

    let theadRow = document.getElementById("stiffness-matrix-thead-row")
    let tbody = document.getElementById("stiffness-matrix-tbody")

    theadRow.style.borderTop = `none`
    theadRow.innerHTML = `<th class="not" style="border:none; width:3rem;"></th>`;
    tbody.innerHTML = "";

    const dim = stiffnessMatrix.length;
    

    let nodeIndex = 1;
    let rowLabelArray = Array(dim).fill(0);
    
    stiffnessMatrix.forEach((col, index) => {  

        if(index % 2 == 0) {
            theadRow.innerHTML += `<th style="border:none;border-right: solid 2px black;${index == 0? `border-left: 2px solid black` : ''}">u${nodeIndex}</th>`;;
            rowLabelArray[index] = `<th style="border:none; border-right: solid 2px black;">u${nodeIndex}</th>`
        } else {
            theadRow.innerHTML += `<th style="border:none;border-right: solid 2px black;">v${nodeIndex}</th>`;;
            rowLabelArray[index] = `<th style="border:none; border-right: solid 2px black;">v${nodeIndex}</th>`;;
            nodeIndex++;
        }

    });

    stiffnessMatrix.forEach((cole, rowIndex) => {

        const tableRow = document.createElement('tr');

        tableRow.innerHTML = `${rowLabelArray[rowIndex]}`;


        stiffnessMatrix[rowIndex].forEach((row, i) => { 
            tableRow.innerHTML += `<td style="border:none; border-right: solid 2px black;"><span class="MatrixCell" id="stiff-${rowIndex}x${i}">${Math.round(row/1000)}</span></td>`
        });

        tbody.appendChild(tableRow);
    });

}

function updateDisplacementMatrix(){

    let displacementMatrix = createDisplacementVector();

    let tbody = document.getElementById("displacement-matrix-tbody")

    tbody.innerHTML = "";

    displacementMatrix.forEach((col, index) => {  
        tbody.innerHTML += `<tr><td style="border:none; border-inline: solid 2px black;"><span class="DisplacementMatrixCell" id="disp${index}x1">${col != 0 ? `${col.at(0)}${parseInt(col.at(1)) + 1}`: col }</span></td></tr>`
    });

}

function updateForceMatrix(){

    let Matrixs = createForceVector();
    let forceMatrix = Matrixs[3];

    let tbody = document.getElementById("force-matrix-tbody")

    tbody.innerHTML = "";


    forceMatrix.forEach((col, index) => {  
        tbody.innerHTML += `<tr><td style="border:none; border-inline: solid 2px black; padding-inline: 1.25rem;" ><span class="ForceMatrixCell" id="Force${index}x1">${col}</span></td></tr>`
    });

}

function updateResultsTable(){
    updateGlobalEquation()
    updateDisplacementMatrix()
    updateForceMatrix()

    // Print stuff to debug and make sure all is going well
    // console.log(elements[2].l, "ele 3 l");
    // console.log(elements[2].m, "ele 3 m");
    // console.log(elements[2].length, "ele 3 length");

    let matrices = solveForDisplacements();
    let resultArray = matrices[0];
    let knownForceResultsArray = matrices[1];

    let saveIndex = matrices[2];
    let NotSavedIndex = matrices[3];
    let resultsArrayNum = matrices[4];

    // console.log(knownForceResultsArray)
    // console.log(resultArray) // all reaction Forces are saved here

    // this section prints the results of displacements, reaction forces, and external forces.
    let sortedDisplacementMatrix = [];
    let sortedForceMatrix =  Array(nodes.length*2).fill(0);

    if(knownForceResultsArray.length > 0) {
        knownForceResultsArray.forEach((entry, index) => {
            if(index %2 == 0) {
                let entryIndex = entry.at(1)-1;
                sortedForceMatrix[entryIndex*2] = parseFloat(entry.split(' ')[2]);
                sortedForceMatrix[entryIndex*2+1] = parseFloat(knownForceResultsArray[index + 1].split(' ')[2]);
            }
        });
    }

    if (nodes.length * 2 < resultArray.length) {
        resultArray.forEach((entry, index) => {
            if(entry.at(0) == 'R' && index %2 == 0) {
            let entryIndex = entry.at(1);
            sortedForceMatrix[entryIndex*2] = parseFloat(entry.split(' ')[4]);
            sortedForceMatrix[entryIndex*2+1] = parseFloat(resultArray[index + 1].split(' ')[4]);
            }
        });
    }

    nodes.forEach((node, index ) => {
    if (NotSavedIndex.indexOf(index*2) != -1) {
        sortedDisplacementMatrix.push(0)
        sortedDisplacementMatrix.push(0)
    } else {
        sortedDisplacementMatrix.push(resultsArrayNum[saveIndex.findIndex(num => num === index*2  )])
        sortedDisplacementMatrix.push(resultsArrayNum[saveIndex.findIndex(num => num === index*2+1)])
    }
    });

    sortedDisplacementMatrix.forEach((entry, index) => {
        sortedDisplacementMatrix[index] = Math.round(entry * 10e6)/10e6})

    // for debugging purposes, print
    // console.log(sortedDisplacementMatrix)
    // console.log(sortedForceMatrix)
    
    // document.getElementById("results-table").innerHTML = "";

    // knownForceResultsArray.forEach((col, index) => {
    //     document.getElementById("results-table").innerHTML += `<p>${col}</p>`;
    // });

    // resultArray.forEach((col, index) => {
    //     document.getElementById("results-table").innerHTML += `<p>${col != 0 ? `${col.at(0)}${parseInt(col.at(1)) + 1}`: col }${col.slice(2)}</p>`;
    // });

    // end of the section that sets up the force and displacement arrays to print in the results table

    // this section gets and prints the table of element results.
    
    try { document.getElementById("nodes-results-table").remove(); } catch (e){}

    let resultsDispTableNodes = document.createElement("table");
    resultsDispTableNodes.classList.add("nodes-results-table");
    resultsDispTableNodes.id = "nodes-results-table";
    let theadNodes = document.createElement("thead")
    let tbodyNodes = document.createElement("tbody")
    theadNodes.innerHTML = `<tr><th>Node #</th><th> u [in]</th><th> v [in]</th><th> Fx [lbf] </th><th> Fy [lbf]</th></tr>`;
    
    sortedDisplacementMatrix.forEach((nodeElement, index) => {
        if(index%2 == 0) {
        tbodyNodes.innerHTML += `<tr><td>${Math.floor(index/2) + 1}</td><td>${sortedDisplacementMatrix[index]}</td><td>${sortedDisplacementMatrix[index+1]}</td><td>${sortedForceMatrix[index]}</td><td>${sortedForceMatrix[index+1]}</td></tr>`;
        }
    });

    resultsDispTableNodes.appendChild(theadNodes);
    resultsDispTableNodes.appendChild(tbodyNodes);

    document.getElementById("results-container").appendChild(resultsDispTableNodes);



    // this section gets and prints the table of element results.

    let elementResults = solveForElementResults(saveIndex, NotSavedIndex, resultsArrayNum);

    try { document.getElementById("element-results-table").remove(); } catch (e){}

    let resultsDispTable = document.createElement("table");
    resultsDispTable.classList.add("element-results-table");
    resultsDispTable.id = "element-results-table";
    let thead = document.createElement("thead")
    let tbody = document.createElement("tbody")
    thead.innerHTML = `<tr><th>Element #</th><th class="longerEntry"> displacement [in]</th><th>Strain</th><th>Stress[psi]</th><th>Force[lbf]</th></tr>`;

    elementResults.forEach((elementResult, index) => {
        tbody.innerHTML += `<tr><td>${index+1}</td><td class="longerEntry">${elementResult[0]}</td><td>${elementResult[1]}</td><td>${elementResult[2]}</td><td>${elementResult[3]}</td></tr>`;
    });

    resultsDispTable.appendChild(thead);
    resultsDispTable.appendChild(tbody);

    document.getElementById("results-container").appendChild(resultsDispTable);

    calcDisplacementMatrix = sortedDisplacementMatrix;
    reactForceMatrix = sortedForceMatrix;
}

function deformPlot() {
    

if(document.getElementById('deformPlot').innerText === 'Preview Results Visually'){
    document.getElementById('deformPlot').innerText = "Hide Results Preview"



document.getElementById("element-lines").classList.toggle("min");
document.getElementById("component-paths").classList.toggle("min");
document.getElementById("node-circles").classList.toggle("min");
document.getElementById("element-labels").classList.toggle("non");
document.getElementById("node-labels").classList.toggle("non");

    

    console.log(calcDisplacementMatrix)
    console.log(reactForceMatrix)

    const resultPreview = document.createElementNS("http://www.w3.org/2000/svg", "g");
    resultPreview.setAttribute('id', 'resultPreview');

    const newNodeCircles = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const newElementLines = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const newComponentPaths = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const newFixturePaths = document.createElementNS("http://www.w3.org/2000/svg", "g");

    newNodeCircles.innerHTML = "";
    newElementLines.innerHTML = "";
    newComponentPaths.innerHTML = "";
    newFixturePaths.innerHTML = "";
    // add the nodes to the svg

    let multiplier = 1;
    let multiplierIncrement = 7;
    // let multiplierfactor = 1.17;

    const intervalId = setInterval(() => {
        newNodeCircles.innerHTML = "";
        newElementLines.innerHTML = "";
        newComponentPaths.innerHTML = "";
        newFixturePaths.innerHTML = "";

    let newNodes = [];
    
    nodes.forEach((node, index) => {
        newNodes.push(new Node(node.x + calcDisplacementMatrix[index * 2]*multiplier,  node.y + calcDisplacementMatrix[index * 2 + 1]*multiplier));
    });

    components.forEach((component, index) => {
        if(component.Type === 'force') {
        }else if(component.Type === 'roller') {
            let newNode = newNodes[nodes.findIndex(obj => obj === component.Node)]
            
            const support = document.createElementNS("http://www.w3.org/2000/svg", "path");
            support.setAttribute("d", `m ${newNode.x} ${100-newNode.y} l -8 8 m 8 -8 l -8 -8 m 0 -2 l 0 20 m 0 -2.5 a 1 1 0 0 0 -5 0 a 1 1 0 0 0 5 0 m 0 -5 a 1 1 0 0 0 -5 0 a 1 1 0 0 0 5 0 m 0 -5 a 1 1 0 0 0 -5 0 a 1 1 0 0 0 5 0 m 0 -5 a 1 1 0 0 0 -5 0 a 1 1 0 0 0 5 0`);
            support.setAttribute("fill", "none");
            support.setAttribute("stroke", "black");
            support.setAttribute("stroke-width", "2px");
            support.setAttribute("stroke-linecap", "round");
            support.style.transform = `rotate(-${component.Angle}deg)`;
            support.style.transformOrigin = `${(newNode.x)/2}% ${(100-newNode.y)/1.5}%`;
            newFixturePaths.appendChild(support);

        } else if(component.Type === 'fixed') {

            let newNode = newNodes[nodes.findIndex(obj => obj === component.Node)]
            const support = document.createElementNS("http://www.w3.org/2000/svg", "path");
            support.setAttribute("d", `m ${newNode.x} ${100-newNode.y} l -8 8 m 8 -8 l -8 -8 m 0 -2 l 0 20 m 0 -1 l -3 -3 m 3 3 m 0 -5 l -3 -3 m 3 3 m 0 -5 l -3 -3 m 3 3 m 0 -5 l -3 -3 m 3 3`);
            support.setAttribute("fill", "none");
            support.setAttribute("stroke", "black");
            support.setAttribute("stroke-width", "2px");
            support.setAttribute("stroke-linecap", "round");
            support.style.transform = `rotate(-${component.Angle}deg)`;
            support.style.transformOrigin = `${(newNode.x)/2}% ${(100-newNode.y)/1.5}%`;
            newFixturePaths.appendChild(support);
        }

    });


    elements.forEach((element, index) => {

            let ni = newNodes[nodes.findIndex(obj => obj === element.Ni)]
            let nf = newNodes[nodes.findIndex(obj => obj === element.Nf)]

            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            const elementText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    
            line.setAttribute("x1", ni.x);
            line.setAttribute("y1", 100-ni.y);
            line.setAttribute("x2", nf.x);
            line.setAttribute("y2", 100-nf.y);
            line.setAttribute("stroke-linecap", "round");
            line.setAttribute("stroke-width", "0.2rem");
            line.setAttribute("stroke", `black`);
            line.setAttribute("stroke", `${element.Material.color}`);

            elementText.setAttribute("x", (nf.x+ni.x)/2);
            elementText.setAttribute("y", (((100-nf.y)+(100-ni.y))/2) +2);
            elementText.setAttribute("font-size", 6);
            elementText.setAttribute("font-weight", 'bolder');
            elementText.setAttribute("fill", 'white');
            elementText.setAttribute("text-anchor", 'middle');
            elementText.setAttribute("z-index", '99');
            elementText.setAttribute("style", 'text-shadow: 0px 0px 4px #000000; user-select: none;');

            elementText.innerHTML = index+1;


            newElementLines.appendChild(line);
            newElementLines.appendChild(elementText);

    
    });

    newNodes.forEach((node, index) => {

        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        const circleText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        
        circle.setAttribute('id', `node${index + 1}circle`)
        circle.setAttribute('class', 'nodeSvg')
        circle.setAttribute("cx", node.x);
        circle.setAttribute("cy", 100 - node.y);
        circle.setAttribute("r", 4.375);
        circle.setAttribute("fill", colours[index]);
        circle.setAttribute("stroke", "black");

        circleText.setAttribute("x", node.x);
        circleText.setAttribute("y", 100-node.y+2);
        circleText.setAttribute("font-size", 6);
        circleText.setAttribute("font-weight", 'bolder');
        circleText.setAttribute("fill", 'white');
        circleText.setAttribute("text-anchor", 'middle');
        circleText.setAttribute("z-index", '99');
        circleText.setAttribute("style", 'user-select: none;');

        circleText.innerHTML = index+1;

        newNodeCircles.appendChild(circle);
        newNodeCircles.appendChild(circleText);


    });

    reactForceMatrix.forEach((farce, index) => {
        if(farce !== 0) {

            let newNode = newNodes[Math.floor(index/2)];
            
            const force = document.createElementNS("http://www.w3.org/2000/svg", "path");
            force.setAttribute("d", `m ${newNode.x + 7} ${100-newNode.y} l 15 0 m 0 0 l -5 4 m 5 -4 l -5 -4`);
            force.setAttribute("fill", "none");
            force.setAttribute("stroke", "red");
            force.setAttribute("stroke-width", "2px");
            force.setAttribute("stroke-linecap", "round");
            force.style.transform = `rotate(${index%2 == 0 ? (farce > 0 ? 0 : 180) : (farce > 0 ? 270 : 90)}deg)`;
            force.style.transformOrigin = `${(newNode.x)/2}% ${(100-newNode.y)/1.5}%`;


            newComponentPaths.appendChild(force);
        }
    })

    resultPreview.appendChild(newFixturePaths)
    resultPreview.appendChild(newElementLines)
    resultPreview.appendChild(newNodeCircles)
    resultPreview.appendChild(newComponentPaths)

    document.getElementById("savage").appendChild(resultPreview);

    multiplier += multiplierIncrement;
    // multiplier *= multiplierfactor;

}, 25);
// }, 40);

setTimeout(() => {
    clearInterval(intervalId);
}, 1250);
    
}else{
    document.getElementById('deformPlot').innerText = "Please Wait ... "
    document.getElementById('deformPlot').removeEventListener('click', deformPlot );
    setTimeout(() => {
    document.getElementById('savage').removeChild(document.getElementById('resultPreview'));
    document.getElementById("element-lines").classList.toggle("min");
    document.getElementById("component-paths").classList.toggle("min");
    document.getElementById("node-circles").classList.toggle("min");
    document.getElementById("element-labels").classList.toggle("non");
    document.getElementById("node-labels").classList.toggle("non");
    document.getElementById('deformPlot').innerText = "Preview Results Visually"
    document.getElementById('deformPlot').addEventListener('click', deformPlot );
    }, 1250);
}
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////// Event Handling /////////////////////////////////////////////////////////

document.addEventListener("DOMContentLoaded", initializeGUI);
document.addEventListener("DOMContentLoaded", updateResultsTable);

document.getElementById('resetTruss').addEventListener('click', () => {location.reload();}); // reset     
document.getElementById('addNodeBtn').addEventListener('click', () => {addNode();});
document.getElementById('addComponentBtn').addEventListener('click', () => {addComponent();});
document.getElementById('addElementBtn').addEventListener('click', () => {addElement();});
document.getElementById('addMaterialBtn').addEventListener('click', () => {addMaterial();});

document.getElementById('updateResults').addEventListener('click', updateResultsTable);

document.getElementById('flip-tables-svg').addEventListener('click', flipFlipButton);
document.getElementById('darkMode-btn').addEventListener('click', darkModeBtn);

document.getElementById('showBarLabel').addEventListener('click', () => {

    document.getElementById("element-labels").classList.toggle('hideBarText')

    if(document.getElementById('showBarLabel').innerText == 'Show Element Labels'){
        document.getElementById('showBarLabel').innerText = "Hide element labels"
    }else{
        document.getElementById('showBarLabel').innerText = "Show Element Labels"}
});

document.getElementById('deformPlot').addEventListener('click', deformPlot );