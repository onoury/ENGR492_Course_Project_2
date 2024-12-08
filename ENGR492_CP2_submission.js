////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/////////////////////////////////////////// Import Variables /////////////////////////////////////////////////////////////////////////

import { nodes, elements, materials, components } from './scriptUp.js';
import { Node, Element, Fixture, Force } from './scriptUp.js';
import {multiplyInverse} from './helperFunctions.js';

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/////////////////////////////////////////// Initialize Variables /////////////////////////////////////////////////////////////////////////




////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/////////////////////////////////////////// Initialize Adjacency Matrix ////////////////////////////////////////////////////////////

function createAdjacencyMatrix(){
    // const letters = ['A1', 'B2', 'C3', 'D4', 'E5', 'F6', 'G7', 'H8'] for debugging purposes
    const n = nodes.length;
    const e = elements.length;
    let matrix = Array.from({ length: n }, () => Array(n).fill(0));
    for(let i = 0; i < n; i++){
        let currentNode = nodes[i];
        for(let j = 0; j < e; j++){
            let currentElement = elements[j];
            if(currentElement.Ni == currentNode){
                    matrix[i][nodes.findIndex(obj => obj === currentElement.Nf)] = currentElement;
                    matrix[nodes.findIndex(obj => obj === currentElement.Nf)][i] = currentElement; // Make the adjacency materix non-directed
            }
        }
    }
    // console.log(matrix);
    return matrix;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/////////////////////////////////////////// Initialize Global Stiffness Matrix /////////////////////////////////////////////////////

export function createStiffnessMatrix(){

    const AdjMatrix = createAdjacencyMatrix();

    const n = nodes.length;

    let stiffnessMatrix = Array.from({ length: n*2 }, () => Array(n*2).fill(0));

    for(let i = 0; i <n; i++) { // loop over each node
        
        AdjMatrix[i].forEach((elConnected, index) => {

            if (elConnected != 0){

                //calculate the diagonal Entries
                stiffnessMatrix[i*2    ][i*2    ]     += Math.round(elConnected.a);
                stiffnessMatrix[i*2    ][i*2 + 1]     += Math.round(elConnected.b);
                stiffnessMatrix[i*2 + 1][i*2    ]     += Math.round(elConnected.b);
                stiffnessMatrix[i*2 + 1][i*2 + 1]     += Math.round(elConnected.c);

                // calculate the connection to the right of the diagonal element 
                stiffnessMatrix[i*2    ][index*2    ] -= Math.round(elConnected.a);
                stiffnessMatrix[i*2    ][index*2 + 1] -= Math.round(elConnected.b);
                stiffnessMatrix[i*2 + 1][index*2    ] -= Math.round(elConnected.b);
                stiffnessMatrix[i*2 + 1][index*2 + 1] -= Math.round(elConnected.c);

                // calculate the connection directly below the diagonal element 
                // if you make the adjacency materix non-directed, keep this section commented out 
                //if you uncomment out this section, remeber that ay node without a direct connection from will be emoty in the stiffness matrix

                // stiffnessMatrix[index*2    ][i*2    ] -= Math.round(elConnected.a);
                // stiffnessMatrix[index*2    ][i*2 + 1] -= Math.round(elConnected.b);
                // stiffnessMatrix[index*2 + 1][i*2    ] -= Math.round(elConnected.b);
                // stiffnessMatrix[index*2 + 1][i*2 + 1] -= Math.round(elConnected.c);

            }

        });

    }

    console.log(stiffnessMatrix);
    return stiffnessMatrix;

}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/////////////////////////////////////////// Initialize Global Displacement Vector /////////////////////////////////////////////////////

export function createDisplacementVector(){

    const n = nodes.length;
    let displacementMatrix = Array.from({ length: 1 }, () => Array(n*2).fill(-1));

    components.forEach((component) => {
        if (component instanceof Fixture && component.Type === 'fixed'){
                let nodeIndex = nodes.findIndex(obj => obj === component.Node)
                displacementMatrix[0][nodeIndex*2] = 0;
                displacementMatrix[0][nodeIndex*2 + 1] = 0;
            }
    });

    let nodeIndex = 0;

    displacementMatrix[0].forEach((entry, index) => { 
    
        if(entry == -1) {

            if(index % 2 == 0) {
                displacementMatrix[index] = `u${nodeIndex}`;
            } else {
                displacementMatrix[index] = `v${nodeIndex}`;
                nodeIndex++;
            }

        }else{ 
            displacementMatrix[index] = entry;
            if(index % 2 != 0) {nodeIndex++;}
        }

    });

    for(let i = 0; i < n*2; i++) {

    }

    // console.log(displacementMatrix);
    return displacementMatrix;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/////////////////////////////////////////// Initialize Global Force Vector /////////////////////////////////////////////////////

export function createForceVector(){

    let stiffnessMatrix = createStiffnessMatrix();
    let displacementMatrix = createDisplacementVector();

    const n = nodes.length;

    let forceMatrix = Array.from({ length: 1 }, () => Array(n*2).fill(-1));
    let forceMatrixPrint = Array.from({ length: 1 }, () => Array(n*2).fill(-1));

    let knownForceResultsDisplay = [];

    // for each component (fixture or force)
    components.forEach((component) => {

        //if :  component is a force
        if (component instanceof Force) {

                // save the index of the node with the current force component
                let nodeIndex = nodes.findIndex(obj => obj === component.Node)

                // if there is a fixture where the current force component is {MAKE THIS A LOOP FOR VALUE}
                let forceAtFixture = components.forEach((comp) => { 
                    if(comp instanceof Fixture && nodes.findIndex(obj => obj === comp.Node) == nodeIndex) {
                        return comp; 
                    }
                });

                // if there is a fixture at the current node with the force component (does not run/ not complete )
                if(forceAtFixture instanceof Fixture) {
                    
                    //if the fixture is a roller
                    if (forceAtFixture.Type === 'roller'){

                        //find the index of the node where this component is
                        let nodeIndex = nodes.findIndex(obj => obj === forceAtFixture.Node)

                        forceMatrix[0][nodeIndex*2] = `R${nodeIndex}x`; // TODO: turn this into a number lol;
                        forceMatrix[0][nodeIndex*2 + 1] = `R${nodeIndex}y`;

                        forceMatrixPrint[0][nodeIndex*2] = `R${nodeIndex}x`; // TODO: turn this into a number lol;
                        forceMatrixPrint[0][nodeIndex*2 + 1] = `R${nodeIndex}y`;

                    } else if (forceAtFixture.Type === 'fixed'){
                        let nodeIndex = nodes.findIndex(obj => obj === forceAtFixture.Node)
                        forceMatrix[0][nodeIndex*2] = `R${nodeIndex}x`; // TODO: turn this into a number lol;
                        forceMatrix[0][nodeIndex*2 + 1] = `R${nodeIndex}y`;

                        forceMatrixPrint[0][nodeIndex*2] = `R${nodeIndex}x`; // TODO: turn this into a number lol;
                        forceMatrixPrint[0][nodeIndex*2 + 1] = `R${nodeIndex}y`;
                    }

                } else { // this part runs and is complete :)

                    let ForceAngle = component.Angle*Math.PI/180;
                    let Fx = Math.round((Math.cos(ForceAngle) * component.Value)*1000)/1000;
                    let Fy = Math.round((Math.sin(ForceAngle) * component.Value)*1000)/1000;

                    forceMatrix[0][nodeIndex*2] = Fx; // TODO: turn this into a number lol
                    forceMatrix[0][nodeIndex*2 + 1] = Fy;

                    forceMatrixPrint[0][nodeIndex*2] = Math.round(Fx); // TODO: turn this into a number lol
                    forceMatrixPrint[0][nodeIndex*2 + 1] = Math.round(Fy);

                    //temporary variable form.
                    // forceMatrix[0][nodeIndex*2] = `F${nodeIndex}x`; // TODO: turn this into a number lol
                    // forceMatrix[0][nodeIndex*2 + 1] = `F${nodeIndex}y`;

                    knownForceResultsDisplay.push(`F${nodeIndex + 1}x = ${Math.round(Fx)} lbf`);
                    knownForceResultsDisplay.push(`F${nodeIndex + 1}y = ${Math.round(Fy)} lbf`); 
                    
                }

        } else {

            if (component.Type === 'roller'){
                let nodeIndex = nodes.findIndex(obj => obj === component.Node)

                //add two columns to the stiffness matrix and place -1 for each reaction force.
                stiffnessMatrix.forEach((row, index) => {
                    
                    if(index == nodeIndex*2 ){
                        row.push(-1);
                        row.push(0);
                    } else if (index == nodeIndex *2 + 1) {
                        row.push(0);
                        row.push(-1);
                    } else {
                        row.push(0);
                        row.push(0);
                    }

                })


                forceMatrix[0].push(0);
                forceMatrix[0].push(0);

                displacementMatrix.push(`R${nodeIndex}x`);
                displacementMatrix.push(`R${nodeIndex}y`);

                //Add two rows to the stiffness Matrix
                let row1 = Array.from({ length: 1 }, () => Array(n*2).fill(0));
                let row2 = Array.from({ length: 1 }, () => Array(n*2).fill(0));

                //get the sin and cosine of the roller angle 
                let rollerAngle = (component.Angle)*Math.PI/180;
                let cosAngle = Math.cos(rollerAngle);
                let sinAngle = Math.sin(rollerAngle);

                // Row 1 is the transformation of the local force equaltion at this node

                row1[0].push(sinAngle == 0  ? 0 : -sinAngle)
                row1[0].push(cosAngle)

                // Row 2 is the transformation of the local displacement equaltion at this node

                row2[0][nodeIndex*2] = cosAngle
                row2[0][nodeIndex*2 + 1] = sinAngle


                row2[0].push(0);
                row2[0].push(0);

                stiffnessMatrix.push(row1[0]);
                stiffnessMatrix.push(row2[0]);

                forceMatrix[0][nodeIndex*2] = 0; // TODO: turn this into a number lol
                forceMatrix[0][nodeIndex*2 + 1] = 0; // debugging stuff might be needed here...   ////////////////////////////////////////////////////// BookMark ///

                // console.log("1:", row1)
                // console.log("2:", row2)

                if (cosAngle == 0) {
                    forceMatrixPrint[0][nodeIndex*2] = 0;
                } else {
                    forceMatrixPrint[0][nodeIndex*2] = `R${nodeIndex+1}x`;
                }
                if (sinAngle == 0) {
                    forceMatrixPrint[0][nodeIndex*2 + 1] = 0;
                }else{
                    forceMatrixPrint[0][nodeIndex*2 + 1] = `R${nodeIndex+1}y`;
                }


            } else if (component.Type === 'fixed'){
                let nodeIndex = nodes.findIndex(obj => obj === component.Node)
                forceMatrix[0][nodeIndex*2] = `R${nodeIndex}x`; // TODO: turn this into a number lol;
                forceMatrix[0][nodeIndex*2 + 1] = `R${nodeIndex}y`;

                forceMatrixPrint[0][nodeIndex*2] = `R${nodeIndex+1}x`; // TODO: turn this into a number lol;
                forceMatrixPrint[0][nodeIndex*2 + 1] = `R${nodeIndex+1}y`;
            }
            

        }
         
        
    });


    let nodeIndex = 0;
    forceMatrix[0].forEach((entry, index) => { 
        if(entry == -1) {

            if(index % 2 == 0) {
                forceMatrix[index] = 0;
            } else {
                forceMatrix[index] = 0;
                nodeIndex++;
            }

        }else{ 
            forceMatrix[index] = entry;
            if(index % 2 != 0) {nodeIndex++;}
        }
    });

    nodeIndex = 0;
    forceMatrixPrint[0].forEach((entry, index) => { 
        if(entry == -1) {

            if(index % 2 == 0) {
                forceMatrixPrint[index] = 0;
            } else {
                forceMatrixPrint[index] = 0;
                nodeIndex++;
            }

        }else{ 
            forceMatrixPrint[index] = entry;
            if(index % 2 != 0) {nodeIndex++;}
        }
    });


    //print the final stiffness, force, and displacement matrices before reducing them.
    // console.log(stiffnessMatrix);
    // console.log(displacementMatrix);
    // console.log(forceMatrix);


    return [stiffnessMatrix, displacementMatrix, forceMatrix, forceMatrixPrint, knownForceResultsDisplay] ;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////// Update Global Equation /////////////////////////////////////////////////////////

function reduceGlobalMatrices(){    /// HUGE NOTE: this function depends on what the prof has to say about the angle to be used to find the roller support reaction forces
    
    let matrices = createForceVector();
    let stiffnessMatrix = matrices[0];
    let displacementMatrix = matrices[1];
    let forceMatrix = matrices[2];

    let knownForceResultsDisplay = matrices[4];

    let saveIndex = [];
    let NotSavedIndex = [];

    //count the number of rollers so we can remove rollycount*2 rows from the reaction force solution .
    let rollerCount = 0;
    components.forEach((compy) => { if (compy instanceof Fixture && compy.Type === 'rolly'){ rollerCount++;}});

    // Loop through the stiffness matrix and find the columns that correspond to the reactions forces

    forceMatrix.forEach((row, index) => {
        if(typeof row === 'number' && !isNaN(row)){
            saveIndex.push(index);
        } else {
            NotSavedIndex.push(index);
        }
    });

    // displacementMatrix.forEach((row, index) => { // idk maybe ill want to have this later on ?!
    //     if(row === 0){
    //             saveIndex.push(index);
    //     }
    // });


/////////////////////current section
    let reactionStiffnessMatrix = NotSavedIndex.map(i =>
        saveIndex.map(j => stiffnessMatrix[i][j])
    );

    let reationForceMatrix = NotSavedIndex.map(i =>
        forceMatrix[i]
    );

 ///////////////////////////////////////////

    let reducedStiffnessMatrixSAFE = saveIndex.map(i =>
        saveIndex.map(j => stiffnessMatrix[i][j])
    );

    let reducedDisplacementMatrixSAFE = saveIndex.map(i =>
        displacementMatrix[i]
    );

    let reducedForceMatrixSAFE = saveIndex.map(i =>
        forceMatrix[i]
    );
    
    // Print stuff to debug and make sure all is going well

    // console.log(`The indeces of the rows/cols kept in the reduced equilibrium equation
    //     note: this includes additional rows/cols due to roller supports` ,saveIndex)

    // console.log(`The indeces of the rows/cols not kept in the reduced equilibrium equation, 
    //     to be solved for later` ,NotSavedIndex)

        
    //     console.log(`The reaction force Matrix to be solved after finding displacements`, 
    //         reactionStiffnessMatrix,
    //         reationForceMatrix
    //      )

    
    // console.log('The Original Force Matrix ', forceMatrix.slice(0, nodes.length*2));
    // console.log('The Original dislacement Matrix', displacementMatrix.slice(0, nodes.length*2));
    // console.log('The Original dislacement Matrix', displacementMatrix.slice(0, nodes.length*2));

    //     //print the final stiffness, force, and displacement matrices before reducing them.
    //     console.log(`Final stiffness, force, and displacement matrices before reducing`,
    //         stiffnessMatrix,
    //         displacementMatrix,
    //         forceMatrix
    //     )

    //     //print the reduced matrices.
    //     console.log(`Reduced stiffness, force, and displacement matrices`,
    //         reducedStiffnessMatrixSAFE,   
    //         reducedDisplacementMatrixSAFE,
    //         reducedForceMatrixSAFE       
    //     )


    let stiffDisplForce = [reducedStiffnessMatrixSAFE, reducedDisplacementMatrixSAFE, reducedForceMatrixSAFE, forceMatrix.slice(0, nodes.length), reactionStiffnessMatrix, reationForceMatrix, knownForceResultsDisplay, saveIndex, NotSavedIndex];
    
    return stiffDisplForce;


}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////// Update Global Equation /////////////////////////////////////////////////////////

export function solveForDisplacements(){

    let stiffy_Disp_Force = reduceGlobalMatrices();

    let reducedStiffnessMatrix =    stiffy_Disp_Force[0]
    let reducedDisplacementMatrix = stiffy_Disp_Force[1]
    let reducedForceMatrix =        stiffy_Disp_Force[2]
    
    let reactionStiffnessMatrix = stiffy_Disp_Force[4]
    let reactionForceMatrix = stiffy_Disp_Force[5]

    let knownForceResultsDisplay = stiffy_Disp_Force[6]

    let resultArray = [];

    
    // Print stuff to debug and make sure all is going well
    // console.log(reducedStiffnessMatrix);
    // console.log(reducedDisplacementMatrix);
    // console.log(reducedForceMatrix);

    // solve the matrix with its inverse transformation
    // let A = reducedStiffnessMatrix;
    // let b = reducedForceMatrix;
    // let x = multiplyInverse(A, b)
    // x.forEach((val, index) => {
    //   resultArray.push(`${reducedDisplacementMatrix[index]}  =  ${val > 100 ? `${Math.round(val*1000)/1000} lbf` : val == 0? '0' : `${Math.round(val*1000000)/1000} ft`}`);
    // });
    // console.log(x);

    
    // solve the matrix with its lu factorization 
    let k = reducedStiffnessMatrix
    let F = reducedForceMatrix
    const d = math.lusolve(k, F);
    d.forEach((val, index) => {
        let typeofentry = reducedDisplacementMatrix[index].at(0);
        resultArray.push(`${reducedDisplacementMatrix[index]}  =  ${typeofentry == 'R' ? `${Math.round(val*1000)/1000} lbf` : val == 0? '0' : `${Math.round(val*1000000)/1000} ft`}`);
    });


    //solve for the other unknowns in the original force matrix,
    let reactionForceReults = math.multiply(reactionStiffnessMatrix,  d);

    reactionForceReults.forEach((val, index) => {
        resultArray.push(`${reactionForceMatrix[index]}  =  ${Math.round(val*1000)/1000} lbf`);
    });


    // Print stuff to debug and make sure all is going well
    // console.log(" calculate reactions forces calculate" , reactionForceReults);
    //print the results line by line to the console
    // resultArray.forEach(val => console.log(val));


    //indexes of the resutls and whatnot// this is for the element result function //
    let saveIndex = stiffy_Disp_Force[7]
    let NotSavedIndex = stiffy_Disp_Force[8]

    // return the results array to display on GUI
    return [resultArray, knownForceResultsDisplay, saveIndex,  NotSavedIndex, d];

}

export function solveForElementResults(saveIndex, NotSavedIndex, resultArray){

    let elementResults = [];

    elements.forEach((element, index) => {
        
        //save the index of the start and end node for this element 
        let startIndex = nodes.findIndex(obj => obj === element.Ni)
        let endIndex = nodes.findIndex(obj => obj === element.Nf)

        let barDisplacementMatrix = []

        //determine the displacements ( u and v ) of the start and end node
        if (NotSavedIndex.indexOf(startIndex*2) != -1) {
            barDisplacementMatrix.push(0)
            barDisplacementMatrix.push(0)
        } else {
            barDisplacementMatrix.push(resultArray[saveIndex.findIndex(num => num === startIndex*2  )])
            barDisplacementMatrix.push(resultArray[saveIndex.findIndex(num => num === startIndex*2+1)])
        }

        if (NotSavedIndex.indexOf(endIndex*2)!= -1) {
            barDisplacementMatrix.push(0) 
            barDisplacementMatrix.push(0)
        } else {
            barDisplacementMatrix.push(resultArray[saveIndex.findIndex(num => num === endIndex*2  )])
            barDisplacementMatrix.push(resultArray[saveIndex.findIndex(num => num === endIndex*2+1)])
        }

        // Print stuff to debug and make sure all is going well
        // console.log(barDisplacementMatrix)
        // console.log(resultArray[saveIndex.findIndex(num => num === startIndex*2  )])
        // console.log(resultArray[saveIndex.findIndex(num => num === startIndex*2+1)])

        let l = element.l;
        let m = element.m;
        let length = element.length;
        let tao = [-l, -m, l, m];

        // console.log(l,m,length,tao)

        let netElementDisplacement = 0;
        barDisplacementMatrix.forEach((val, index) => { netElementDisplacement += val*tao[index]});
        netElementDisplacement =   Math.round(netElementDisplacement            *10e6)/10e6;
        let elementStrain      =   Math.round(netElementDisplacement/(length/10)*10e6)/10e6
        let elementStress      =   Math.round(element.El * elementStrain             )
        let elementForce       =   Math.round(elementStress * element.Ar             )

        let elementResultsEntry = [netElementDisplacement, elementStrain, elementStress, elementForce]

        // console.log(elementResultsEntry)

        elementResults.push(elementResultsEntry);

    })

    //for some serious debugging when you add a new node, adding elements works well tho 
    // i made it work but didnt test it enough times//
    // console.log(elements)
    // console.log(nodes)

    return elementResults;


}




////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////// Event Handling /////////////////////////////////////////////////////////

// document.getElementById('updateResults').addEventListener('click', createAdjacencyMatrix);
// document.getElementById('updateResults').addEventListener('click', createStiffnessMatrix);
// document.getElementById('updateResults').addEventListener('click', createDisplacementVector);
// document.getElementById('updateResults').addEventListener('click', createForceVector);

// document.getElementById('updateResults').addEventListener('click', solveForDisplacements);
// document.addEventListener("DOMContentLoaded", solveForDisplacements);

// document.addEventListener("DOMContentLoaded",createAdjacencyMatrix);
// document.addEventListener("DOMContentLoaded",createStiffnessMatrix);
// document.addEventListener("DOMContentLoaded",createDisplacementVector);
// document.addEventListener("DOMContentLoaded", reduceGlobalMatrices);
// document.addEventListener("DOMContentLoaded", reduceGlobalMatrices);

// document.addEventListener("DOMContentLoaded", reduceGlobalMatrices);

// document.addEventListener("DOMContentLoaded", solveForDisplacements);
// document.getElementById('updateResults').addEventListener('click', solveForDisplacements);





    