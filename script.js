document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const fileInput = document.getElementById('fileInput');
    const loadBtn = document.getElementById('loadBtn');
    const pruebaSelect = document.getElementById('pruebaSelect');
    const selectPruebaBtn = document.getElementById('selectPruebaBtn');
    const backToStep1Btn = document.getElementById('backToStep1Btn');
    const prevParticipantBtn = document.getElementById('prevParticipantBtn');
    const nextParticipantBtn = document.getElementById('nextParticipantBtn');
    const participantCounter = document.getElementById('participantCounter');
    const participantInfo = document.getElementById('participantInfo');
    const tiempoInput = document.getElementById('tiempoInput');
    const faltasInput = document.getElementById('faltasInput');
    const saveResultBtn = document.getElementById('saveResultBtn');
    const backToStep2Btn = document.getElementById('backToStep2Btn');
    const resultsContainer = document.getElementById('resultsContainer');
    const exportResultsBtn = document.getElementById('exportResultsBtn');
    const newPruebaBtn = document.getElementById('newPruebaBtn');
    
    // Variables de estado
    let pruebas = [];
    let participantes = [];
    let resultados = [];
    let currentIndex = 0;
    let currentPrueba = null;
    
    // Paso 1: Cargar archivo Excel
    loadBtn.addEventListener('click', function() {
        if (!fileInput.files.length) {
            alert('Por favor selecciona un archivo Excel');
            return;
        }
        
        loadBtn.textContent = 'Cargando...';
        loadBtn.disabled = true;
        
        const file = fileInput.files[0];
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
                
                pruebas = procesarExcel(jsonData);
                
                if (pruebas.length === 0) {
                    throw new Error('No se encontraron pruebas en el archivo');
                }
                
                llenarSelectorPruebas();
                mostrarPaso(2);
                
            } catch (error) {
                console.error('Error:', error);
                alert('Error al procesar el archivo: ' + error.message);
            } finally {
                loadBtn.textContent = 'Cargar Archivo';
                loadBtn.disabled = false;
            }
        };
        
        reader.onerror = function() {
            alert('Error al leer el archivo');
            loadBtn.textContent = 'Cargar Archivo';
            loadBtn.disabled = false;
        };
        
        reader.readAsArrayBuffer(file);
    });
    
    // Paso 2: Seleccionar prueba
    selectPruebaBtn.addEventListener('click', function() {
        const pruebaNombre = pruebaSelect.value;
        currentPrueba = pruebas.find(p => p.nombre === pruebaNombre);
        
        if (!currentPrueba) {
            alert('Por favor selecciona una prueba válida');
            return;
        }
        
        participantes = currentPrueba.participantes;
        resultados = participantes.map(p => ({
            ...p,
            tiempo: 0,
            faltas: 0,
            puntuacion: 0
        }));
        
        currentIndex = 0;
        actualizarVistaParticipante();
        mostrarPaso(3);
    });
    
    // Navegación entre pasos
    backToStep1Btn.addEventListener('click', () => mostrarPaso(1));
    backToStep2Btn.addEventListener('click', () => mostrarPaso(2));
    newPruebaBtn.addEventListener('click', () => mostrarPaso(2));
    
    // Navegación entre participantes
    prevParticipantBtn.addEventListener('click', function() {
        if (currentIndex > 0) {
            currentIndex--;
            actualizarVistaParticipante();
        }
    });
    
    nextParticipantBtn.addEventListener('click', function() {
        if (currentIndex < participantes.length - 1) {
            currentIndex++;
            actualizarVistaParticipante();
        }
    });
    
    // Validación de faltas (múltiplos de 4)
    faltasInput.addEventListener('change', function() {
        const value = parseInt(this.value);
        if (isNaN(value) || value % 4 !== 0) {
            this.value = Math.round(value / 4) * 4;
            if (this.value < 0) this.value = 0;
        }
    });
    
    // Guardar resultado
    saveResultBtn.addEventListener('click', function() {
        const tiempo = parseFloat(tiempoInput.value);
        const faltas = parseInt(faltasInput.value);
        
        if (isNaN(tiempo)) {
            alert('Ingresa un tiempo válido');
            return;
        }
        
        if (isNaN(faltas)) {
            alert('Ingresa un número válido de faltas');
            return;
        }
        
        if (faltas % 4 !== 0) {
            alert('Las faltas deben ser múltiplos de 4 (0, 4, 8, 12...)');
            return;
        }
        
        // Calcular puntuación según tipo de prueba
        const esTiempoDirecto = currentPrueba.tipo.includes('TIEMPO DIRECTO');
        const puntuacion = esTiempoDirecto 
            ? 10000 - (faltas * 100 + tiempo * 10)
            : 10000 - (faltas * 1000 + tiempo);
        
        // Guardar resultado
        resultados[currentIndex] = {
            ...resultados[currentIndex],
            tiempo,
            faltas,
            puntuacion
        };
        
        // Mostrar confirmación
        alert(`Resultado guardado para ${participantes[currentIndex].jinete}`);
        
        // Si es el último participante, mostrar resultados
        if (currentIndex === participantes.length - 1) {
            mostrarResultados();
            mostrarPaso(4);
        }
    });
    
    // Exportar resultados
    exportResultsBtn.addEventListener('click', function() {
        const resultadosOrdenados = [...resultados].sort((a, b) => b.puntuacion - a.puntuacion);
        
        const datosExportar = [
            ['Posición', 'Número', 'Jinete/Amazona', 'Caballo', 'Club', 'Faltas', 'Tiempo'],
            ...resultadosOrdenados.map((res, i) => [
                i + 1,
                res.numero,
                res.jinete,
                res.caballo,
                res.club,
                res.faltas,
                res.tiempo.toFixed(2)
            ])
        ];
        
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet(datosExportar);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Resultados');
        
        const nombreArchivo = `Resultados_${currentPrueba.nombre.replace(/[^a-z0-9]/gi, '_')}.xlsx`;
        XLSX.writeFile(workbook, nombreArchivo);
    });
    
    // Funciones auxiliares
    function mostrarPaso(numeroPaso) {
        document.querySelectorAll('.step').forEach((paso, index) => {
            paso.classList.toggle('hidden', index + 1 !== numeroPaso);
        });
    }
    
    function procesarExcel(datos) {
        const pruebasEncontradas = [];
        let pruebaActual = null;
        
        for (let i = 0; i < datos.length; i++) {
            const fila = datos[i];
            
            // Detectar inicio de nueva prueba
            if (fila[0] && typeof fila[0] === 'string' && 
                (fila[0].includes('PRUEBA') || fila[0].includes('CONCURSO'))) {
                
                if (pruebaActual) {
                    pruebasEncontradas.push(pruebaActual);
                }
                
                pruebaActual = {
                    nombre: fila[0].trim(),
                    altura: '',
                    tipo: '',
                    participantes: []
                };
                
                // Buscar detalles en siguientes filas
                for (let j = i + 1; j < Math.min(i + 10, datos.length); j++) {
                    const siguienteFila = datos[j];
                    
                    if (siguienteFila[0] && typeof siguienteFila[0] === 'string') {
                        if (siguienteFila[0].includes('ALTURA')) {
                            pruebaActual.altura = siguienteFila[0].replace('ALTURA', '').trim();
                        } else if (siguienteFila[0].includes('TIPO DE PRUEBA')) {
                            pruebaActual.tipo = (siguienteFila[0].split(':')[1] || '').trim();
                        }
                    }
                }
                
                continue;
            }
            
            // Detectar participantes (filas que empiezan con número)
            if (pruebaActual && fila[0] && !isNaN(parseInt(fila[0]))) {
                pruebaActual.participantes.push({
                    numero: fila[0],
                    jinete: fila[2] || '',
                    caballo: fila[3] || '',
                    club: fila[4] || ''
                });
            }
        }
        
        // Añadir la última prueba
        if (pruebaActual) {
            pruebasEncontradas.push(pruebaActual);
        }
        
        return pruebasEncontradas;
    }
    
    function llenarSelectorPruebas() {
        pruebaSelect.innerHTML = '';
        pruebas.forEach(prueba => {
            const option = document.createElement('option');
            option.value = prueba.nombre;
            option.textContent = prueba.nombre;
            pruebaSelect.appendChild(option);
        });
    }
    
    function actualizarVistaParticipante() {
        const participante = participantes[currentIndex];
        const resultado = resultados[currentIndex];
        
        participantCounter.textContent = `${currentIndex + 1} de ${participantes.length}`;
        participantInfo.innerHTML = `
            <strong>Participante #${participante.numero}</strong><br>
            <strong>Jinete/Amazona:</strong> ${participante.jinete}<br>
            <strong>Caballo:</strong> ${participante.caballo}<br>
            <strong>Club:</strong> ${participante.club}
        `;
        
        // Actualizar valores de los inputs
        tiempoInput.value = resultado.tiempo > 0 ? resultado.tiempo : '';
        faltasInput.value = resultado.faltas;
        
        // Actualizar estado de botones de navegación
        prevParticipantBtn.disabled = currentIndex === 0;
        nextParticipantBtn.disabled = currentIndex === participantes.length - 1;
        
        // Enfocar el campo de tiempo
        tiempoInput.focus();
    }
    
    function mostrarResultados() {
        const resultadosOrdenados = [...resultados].sort((a, b) => b.puntuacion - a.puntuacion);
        
        let html = `
            <h3>${currentPrueba.nombre}</h3>
            <p><strong>Altura:</strong> ${currentPrueba.altura} | 
            <strong>Tipo:</strong> ${currentPrueba.tipo}</p>
            <table>
                <thead>
                    <tr>
                        <th>Pos</th>
                        <th>#</th>
                        <th>Jinete/Amazona</th>
                        <th>Caballo</th>
                        <th>Club</th>
                        <th>Faltas</th>
                        <th>Tiempo</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        resultadosOrdenados.forEach((res, index) => {
            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${res.numero}</td>
                    <td>${res.jinete}</td>
                    <td>${res.caballo}</td>
                    <td>${res.club}</td>
                    <td>${res.faltas}</td>
                    <td>${res.tiempo.toFixed(2)}</td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
        `;
        
        resultsContainer.innerHTML = html;
    }
    
    // Atajos de teclado
    tiempoInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') faltasInput.focus();
    });
    
    faltasInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') saveResultBtn.click();
    });
});