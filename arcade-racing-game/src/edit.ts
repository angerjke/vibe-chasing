import * as THREE from 'three';

// levelEditor.js

// edit.ts (с автосохранением и управлением камерой в редакторе)

import * as THREE from 'three';

export function initLevelEditor({ scene, camera, ground, physicsWorld=null, createRoadSegment, createTree, createHouse, createBarrier, createConcreteBarrierLine, createClassicHouse, createModernHighrise, generateLevelFromObjects }) {
    let editorMode = true;
    let selectedTool = 'road';
    let previewMesh = null;
    let editorObjects = [];
    let editorMeshes = [];
    let currentRotation = 0;
    let currentWidth = 6;
    let currentLength = 20;
    let currentBorderLength = 20;
    let currentBorderStep = 2.2;
    let currentMarking = 'none';
    let currentTreeType = 0;
    let currentHouseType = 'house';
    let currentScale = 1;
    let currentWithCurbs = true;
    let currentCurbSide = 'both';
    let deleteMode = false;
    let cameraSpeed = 1;

    const cameraMove = {
        ArrowUp: false,
        ArrowDown: false,
        ArrowLeft: false,
        ArrowRight: false
    };

    window.addEventListener('keydown', (e) => {
        if (!editorMode) return;
      
        if (e.key.toLowerCase() === 'r' && previewMesh) {
          currentRotation += Math.PI / 8;
          previewMesh.rotation.y = currentRotation;
        }
      
        if (e.key.toLowerCase() === 'x') {
          deleteMode = !deleteMode;
          toolbar.style.border = deleteMode ? '2px solid red' : 'none';
        }
      
        if (cameraMove.hasOwnProperty(e.key)) {
          cameraMove[e.key] = true;
          e.preventDefault(); // предотвращает прокрутку страницы
        }
      });

    const toolbar = document.createElement('div');
    toolbar.id = 'editor-toolbar';
    toolbar.style.cssText = `
      position: absolute;
      top: 10px; left: 10px;
      background: rgba(255,255,255,0.9);
      padding: 10px;
      border-radius: 10px;
      font-family: sans-serif;
      z-index: 10;
    `;
    toolbar.innerHTML = `
      <button onclick="window.setEditorTool('road')">🛣️ Road</button>
      <button onclick="window.setEditorTool('tree')">🌳 Tree</button>
      <button onclick="window.setEditorTool('house')">🏠 House</button>
      <button onclick="window.setEditorTool('barrier')">🚧 Barrier</button>
      <button onclick="window.setEditorTool('borderLine')">🧱 Border Line</button>
      <br><br>
      Length: <input id="editor-border-length" type="number" value="20" style="width:50px;">
Step: <input id="editor-border-step" type="number" value="2.2" style="width:50px;">

      Width: <input id="editor-width" type="number" value="6" style="width:40px;"> 
      Length: <input id="editor-length" type="number" value="20" style="width:50px;">
      <br>
      Marking: 
      <select id="editor-marking">
        <option value="none">none</option>
        <option value="dashed-center">dashed-center</option>
        <option value="double-yellow">double-yellow</option>
        <option value="crosswalk">crosswalk</option>
        <option value="two-lane-both-sides">two-lane-both-sides</option>
      </select>
      <br>
      <label><input type="checkbox" id="editor-curbs" checked> With Curbs</label>
      <br>
      <br>
Curb Side:
<select id="editor-curb-side">
  <option value="both">both</option>
  <option value="left">left</option>
  <option value="right">right</option>
  <option value="none">none</option>
</select>
      Tree Type:
      <select id="editor-tree-type">
        <option value="0">Round</option>
        <option value="1">Ball</option>
        <option value="2">Sphere</option>
        <option value="3">Octa</option>
        <option value="4">Pine</option>
      </select>
      <br>
      House Type:
      <select id="editor-house-type">
        <option value="house">House</option>
        <option value="classicHouse">Classic House</option>
        <option value="highrise">Highrise</option>
      </select>
      <br>
      Scale: <input id="editor-scale" type="number" value="1" min="0.1" step="0.1" style="width:50px;">
      <br><br>
      <button onclick="window.startEditorGame()">▶️ Play</button>
      <button onclick="window.exportEditorLevel()">💾 Export</button>
      <button onclick="window.saveEditorLevel()">💽 Save</button>
      <button onclick="window.loadEditorLevel()">📂 Load</button>
      <br>
      <small>Press 'X' to delete mode</small>
    `;
    document.body.appendChild(toolbar);

    window.setEditorTool = function(tool) {
        selectedTool = tool;
        currentRotation = 0;
        updatePreviewMesh();
    };

    window.exportEditorLevel = function() {
        const json = JSON.stringify(editorObjects, null, 2);
        console.log('LEVEL JSON:', json);
        navigator.clipboard.writeText(json);
        alert("Уровень скопирован в буфер!");
    };

    window.saveEditorLevel = function() {
        localStorage.setItem('savedLevel', JSON.stringify(editorObjects));
        console.log("Автосохранение уровня");
    };

    window.loadEditorLevel = function() {
        const saved = localStorage.getItem('savedLevel');
        if (!saved) return alert("Нет сохранённого уровня");
        try {
            const parsed = JSON.parse(saved);
            editorObjects = parsed;
            for (let mesh of editorMeshes) scene.remove(mesh);
            editorMeshes = [];
            for (let obj of editorObjects) {
                const mesh = createObjectFromTool(obj);
                editorMeshes.push(mesh);
                scene.add(mesh);
            }
        } catch (e) {
            alert("Ошибка загрузки: " + e.message);
        }
    };

    window.startEditorGame = function() {
        editorMode = false;
        toolbar.style.display = 'none';
        for (let mesh of editorMeshes) scene.remove(mesh);
        editorMeshes = [];
        generateLevelFromObjects(editorObjects, scene, physicsWorld);
    };

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    window.addEventListener('mousemove', (event) => {
        if (!editorMode || !previewMesh) return;
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(ground);
        if (intersects.length > 0) {
            const point = intersects[0].point;
            previewMesh.position.set(
                Math.round(point.x / 2) * 2,
                0.05,
                Math.round(point.z / 2) * 2
            );
        }
    });

    window.addEventListener('click', (event) => {
        if (!editorMode || toolbar.contains(event.target)) return;
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(editorMeshes);
        if (intersects.length > 0) {
            const meshToRemove = intersects[0].object;
            let root = meshToRemove;
            while (root.parent && root.parent !== scene) {
                root = root.parent;
            }
            const index = editorMeshes.indexOf(root);
            if (index !== -1 && deleteMode) {
                scene.remove(root);
                editorMeshes.splice(index, 1);
                editorObjects.splice(index, 1);
                window.saveEditorLevel();
                return;
            }
        }

        if (deleteMode) return;

        const pos = [previewMesh.position.x, previewMesh.position.z];
        const rot = previewMesh.rotation.y;
        const newObj = { type: selectedTool, position: pos, rotation: rot };

        if (selectedTool === 'borderLine') {
            newObj.type = 'borderLine';
            newObj.start = pos;
            newObj.rotation = rot;
            newObj.length = currentBorderLength;
            newObj.step = currentBorderStep;
          }
        if (selectedTool === 'road') {
            newObj.width = currentWidth;
            newObj.length = currentLength;
            newObj.marking = currentMarking;
            newObj.withCurbs = currentWithCurbs;
            newObj.curbSide = currentCurbSide;
        } else if (selectedTool === 'tree') {
            newObj.treeType = currentTreeType;
            newObj.scale = currentScale;
        } else if (selectedTool === 'house') {
            newObj.type = currentHouseType;
            newObj.scale = currentScale;
        }

        const mesh = createObjectFromTool(newObj);
        mesh.userData.type = selectedTool;
        scene.add(mesh);
        editorObjects.push(newObj);
        editorMeshes.push(mesh);
        window.saveEditorLevel();
    });

    function updateEditorCamera() {
        if (!editorMode) return;
        const dir = new THREE.Vector3();
        if (cameraMove.ArrowUp) dir.z -= 1;
        if (cameraMove.ArrowDown) dir.z += 1;
        if (cameraMove.ArrowLeft) dir.x -= 1;
        if (cameraMove.ArrowRight) dir.x += 1;
        dir.normalize().multiplyScalar(cameraSpeed);
        camera.position.add(dir);
        camera.lookAt(0, 0, 0);
    }

    function updatePreviewMesh() {
        if (previewMesh) {
            scene.remove(previewMesh);
            previewMesh = null;
        }
        currentWidth = parseFloat(document.getElementById('editor-width').value) || 6;
        currentLength = parseFloat(document.getElementById('editor-length').value) || 20;
        currentMarking = document.getElementById('editor-marking')?.value || 'none';
        currentTreeType = parseInt(document.getElementById('editor-tree-type')?.value || '0');
        currentHouseType = document.getElementById('editor-house-type')?.value || 'house';
        currentScale = parseFloat(document.getElementById('editor-scale')?.value || '1');
        currentWithCurbs = document.getElementById('editor-curbs')?.checked ?? true;
        currentCurbSide = document.getElementById('editor-curb-side')?.value || 'both';

        currentBorderLength = parseFloat(document.getElementById('editor-border-length')?.value || '20');
        currentBorderStep = parseFloat(document.getElementById('editor-border-step')?.value || '2.2');

        console.log({currentCurbSide})
        if (selectedTool === 'road') {
            previewMesh = createRoadSegment({ marking: currentMarking, width: currentWidth, length: currentLength, withCurbs: currentWithCurbs, curbSide: currentCurbSide });
        } else if (selectedTool === 'tree') {
            previewMesh = createTree(currentTreeType);
        } else if (selectedTool === 'house') {
            if (currentHouseType === 'classicHouse') previewMesh = createClassicHouse();
            else if (currentHouseType === 'highrise') previewMesh = createModernHighrise();
            else previewMesh = createHouse();
        }
        else if (selectedTool === 'borderLine') {
            previewMesh = createConcreteBarrierLine([0, 0], currentRotation, currentBorderLength, currentBorderStep);
          }
        else if (selectedTool === 'barrier') {
            previewMesh = createBarrier([0, 0], 10);
          }
        const curbSideEl = document.getElementById('editor-curb-side');
        const curbSide = curbSideEl ? curbSideEl.value : 'both';
        if (previewMesh) {
            previewMesh.traverse(obj => {
                if (obj.isMesh) {
                    obj.material = obj.material.clone();
                    obj.material.transparent = true;
                    obj.material.opacity = 0.5;
                }
            });
            previewMesh.rotation.y = currentRotation;
            if (selectedTool !== 'road') previewMesh.scale.set(currentScale, currentScale, currentScale);
            scene.add(previewMesh);
        }
    }

    function createObjectFromTool(obj) {
        const pos = obj.position;
        const rot = obj.rotation || 0;
        const scale = obj.scale || 1;
        let mesh = null;
        if (obj.type === 'road') {
            mesh = createRoadSegment({ position: pos,
             rotation: rot,
             width: obj.width,
             length: obj.length, marking: obj.marking, withCurbs: obj.withCurbs, curbSide: obj.curbSide });
        } else if (obj.type === 'tree') {
            mesh = createTree(obj.treeType);
            mesh.position.set(pos[0], 0, pos[1]);
            mesh.rotation.y = rot;
            mesh.scale.set(scale, scale, scale);
        } else if (['house', 'classicHouse', 'highrise'].includes(obj.type)) {
            if (obj.type === 'classicHouse') mesh = createClassicHouse();
            else if (obj.type === 'highrise') mesh = createModernHighrise();
            else mesh = createHouse();
            mesh.position.set(pos[0], 0, pos[1]);
            mesh.rotation.y = rot;
            mesh.scale.set(scale, scale, scale);
        }
        else if (obj.type === 'barrier') {
            mesh = createBarrier(pos, rot, scale, physicsWorld);
          }
          else if (obj.type === 'borderLine') {
            mesh = createConcreteBarrierLine(obj.start, obj.rotation ?? 0, obj.length ?? 10, obj.step ?? 2.2);
          }
          
        return mesh;
    }

    window.loadEditorLevel()
    updatePreviewMesh();
    // Экспорт функции камеры, чтобы использовать её в animate
    window.updateEditorCamera = updateEditorCamera;
}

  // initLevelEditor({
  //   scene,
  //   camera,
  //   ground,
  //   physicsWorld,
  //   createRoadSegment,
  //   createTree,
  //   createHouse,
  //   createClassicHouse,
  //   createModernHighrise,
  //   createBarrier,
  //   generateLevelFromObjects,
  //   createConcreteBarrierLine,
  // });