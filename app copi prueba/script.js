document.addEventListener('DOMContentLoaded', () => {
    // ====================================================================
    // REFERENCIAS A ELEMENTOS DEL DOM
    // ====================================================================
    const dailyRateInput = document.getElementById('dailyRate');
    const productsSelect = document.getElementById('productSelect');
    const quantityInput = document.getElementById('quantity');
    const addProductBtn = document.getElementById('addProductBtn');
    const addProductManualBtn = document.getElementById('addProductManualBtn');
    const itemsList = document.getElementById('itemsList');
    const totalUsdDisplay = document.getElementById('totalUsdDisplay');
    const totalBsDisplay = document.getElementById('totalBsDisplay');
    const paymentMethodSelect = document.getElementById('paymentMethod');
    const completeSaleBtn = document.getElementById('completeSaleBtn');
    const saleDateDisplay = document.getElementById('saleDate'); // Para la fecha de la venta

    // ====================================================================
    // CONFIGURACIÓN: PEGA AQUÍ LAS URLS DE TUS APLICACIONES WEB DE GOOGLE APPS SCRIPT
    // ====================================================================
    // URL para obtener la tasa del BCV
    const GAS_API_URL_BCV = 'https://script.google.com/macros/s/AKfycbxL3_X022Ue_O2rXp_W5_B0_L3_X022Ue_O2rXp_W5_B0_L3_X022Ue_O2rXp_W5_B0/exec'; // ASEGÚRATE DE QUE ESTA ES LA CORRECTA
    // URL para obtener productos del inventario
    const GAS_API_URL_INVENTORY = 'https://script.google.com/macros/s/AKfycb_K4mS6r4G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z/exec'; // ASEGÚRATE DE QUE ESTA ES LA CORRECTA
    // URL para registrar ventas
    const GAS_API_URL_SALES_RECORD = 'https://script.google.com/macros/s/AKfycbw8OpacXttWdBhkSbGCsuTLZzokTyIxlC_nIY6H_Izj22Yonuo8iypOb85Wz7t2lUEBDA/exec'; // ESTA ES LA URL DE TU SCRIPT DE VENTAS
    // ====================================================================

    let saleItems = []; // Array para almacenar los productos en la venta actual
    let availableProducts = []; // Array para los productos cargados del inventario

    // ====================================================================
    // FUNCIONES PRINCIPALES
    // ====================================================================

    // Función para obtener la tasa del BCV automáticamente
    async function fetchDailyRateFromBCV() {
        try {
            const response = await fetch(GAS_API_URL_BCV);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            if (data.success && data.tasa) {
                dailyRateInput.value = parseFloat(data.tasa).toFixed(2);
                console.log('Tasa del BCV obtenida:', data.tasa);
                updateTotals(); // Actualizar totales una vez que la tasa esté disponible
            } else {
                console.error('Error al obtener la tasa del BCV:', data.error || 'Respuesta inesperada');
                dailyRateInput.value = 'Error';
            }
        } catch (error) {
            console.error('Fallo la conexión con la API de BCV o la red:', error);
            dailyRateInput.value = 'Error';
        }
    }

    // Función para obtener los productos del inventario (Google Sheet)
    async function fetchProductsFromInventory() {
        try {
            const response = await fetch(GAS_API_URL_INVENTORY);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            if (data.success && Array.isArray(data.products)) {
                availableProducts = data.products; // Guarda los productos obtenidos
                populateProductsSelect(); // Rellena el selector con los productos cargados
                console.log('Productos del inventario cargados:', availableProducts);
            } else {
                console.error('Error al obtener productos del inventario:', data.error || 'Respuesta inesperada');
                alert('Error al cargar los productos. Consulta la consola para más detalles.');
            }
        } catch (error) {
            console.error('Fallo la conexión con la API de Inventario o la red:', error);
            alert('No se pudieron cargar los productos. Asegúrate de tener conexión a internet y que la API del inventario esté funcionando.');
        }
    }

    // Rellenar el selector de productos con los productos cargados
    function populateProductsSelect() {
        productsSelect.innerHTML = '<option value="">Selecciona un producto</option>'; // Opción por defecto
        availableProducts.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            // Mostramos el nombre y el precio de venta en el selector
            option.textContent = `${product.name} ($${product.priceUsd ? product.priceUsd.toFixed(2) : '0.00'})`;
            productsSelect.appendChild(option);
        });
    }

    // Actualizar los totales de la venta
    function updateTotals() {
        const totalUsd = saleItems.reduce((sum, item) => sum + (item.priceUsd * item.quantity), 0);
        const dailyRate = parseFloat(dailyRateInput.value);
        const totalBs = isNaN(dailyRate) || dailyRate <= 0 ? 0 : totalUsd * dailyRate;

        totalUsdDisplay.textContent = `$${totalUsd.toFixed(2)}`;
        totalBsDisplay.textContent = `Bs ${totalBs.toFixed(2)}`;
    }

    // Renderizar los ítems en la lista de venta
    function renderSaleItems() {
        itemsList.innerHTML = ''; // Limpiar la lista actual
        saleItems.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'sale-item-list';
            const itemTotalUsd = (item.priceUsd * item.quantity).toFixed(2);
            li.innerHTML = `
                <span>${item.name} (x${item.quantity}) - $${itemTotalUsd}</span>
                <button class="remove-item-btn" data-index="${index}">🗑️</button>
            `;
            itemsList.appendChild(li);
        });
        updateTotals();
    }

    // Función para mostrar la fecha actual
    function displayCurrentDate() {
        const today = new Date();
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        saleDateDisplay.textContent = today.toLocaleDateString('es-VE', options);
    }

    // ====================================================================
    // MANEJADORES DE EVENTOS
    // ====================================================================

    // Evento para añadir producto desde el selector
    addProductBtn.addEventListener('click', () => {
        const productId = productsSelect.value;
        const quantity = parseInt(quantityInput.value);

        if (!productId || isNaN(quantity) || quantity <= 0) {
            alert('Por favor, selecciona un producto y una cantidad válida.');
            return;
        }

        const product = availableProducts.find(p => p.id === productId);
        if (product) {
            // Verifica si el producto ya está en la lista de venta para actualizar la cantidad
            const existingItem = saleItems.find(item => item.id === productId);
            if (existingItem) {
                existingItem.quantity += quantity;
            } else {
                saleItems.push({
                    id: product.id,
                    name: product.name,
                    priceUsd: product.priceUsd,
                    quantity: quantity,
                    category: product.category, // Incluir la categoría
                    stock: product.stock // Incluir el stock inicial
                });
            }
            renderSaleItems();
            quantityInput.value = '1'; // Resetear cantidad a 1
            productsSelect.value = ''; // Limpiar selección
        } else {
            alert('Producto no encontrado.');
        }
    });

    // Evento para añadir producto manualmente (si se activa)
    // Actualmente el botón no tiene funcionalidad, pero si se añade un modal, etc., se usaría aquí.
    addProductManualBtn.addEventListener('click', () => {
        alert('Funcionalidad para agregar producto manualmente aún no implementada.');
    });

    // Evento para remover un ítem de la lista de venta
    itemsList.addEventListener('click', (event) => {
        if (event.target.classList.contains('remove-item-btn')) {
            const index = parseInt(event.target.dataset.index);
            saleItems.splice(index, 1); // Eliminar el ítem del array
            renderSaleItems(); // Volver a renderizar la lista
        }
    });

    // Evento para completar la venta
    completeSaleBtn.addEventListener('click', async () => {
        if (saleItems.length === 0) {
            alert('No hay ítems en la venta para completar.');
            return;
        }

        const dailyRate = parseFloat(dailyRateInput.value);
        if (isNaN(dailyRate) || dailyRate <= 0 || dailyRateInput.value === 'Error') {
            alert('La tasa del día no es válida o no se ha cargado. No se puede completar la venta.');
            return;
        }

        const totalUsd = saleItems.reduce((sum, item) => sum + (item.priceUsd * item.quantity), 0);
        const totalBs = totalUsd * dailyRate;
        const paymentMethod = paymentMethodSelect.value;

        if (paymentMethod === '') {
            alert('Por favor, selecciona un método de pago.');
            return;
        }

        // Preparar el detalle de los productos para la hoja de cálculo
        const detalleProductos = saleItems.map(item =>
            `${item.name} (x${item.quantity}) - $${(item.priceUsd * item.quantity).toFixed(2)}`
        ).join('; ');

        // Datos de la venta a enviar a Google Sheets
        const saleData = {
            fechaVenta: new Date().toLocaleString('es-VE', { timeZone: 'America/Caracas' }),
            totalUsd: totalUsd.toFixed(2),
            totalBs: totalBs.toFixed(2),
            metodoPago: paymentMethod,
            detalleProductos: detalleProductos
        };

        // --- Envío de datos a la API de Registro de Ventas ---
        try {
            const response = await fetch(GAS_API_URL_SALES_RECORD, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(saleData)
            });

            if (!response.ok) {
                // Si la respuesta no es OK (ej. 404, 500), lanzar un error
                let errorDetails = `Error en el servidor: ${response.status}`;
                try {
                    const errorJson = await response.json();
                    errorDetails += ` - ${errorJson.error || JSON.stringify(errorJson)}`;
                } catch (jsonError) {
                    // Si no se puede parsear como JSON, usar el texto de la respuesta
                    errorDetails += ` - ${await response.text()}`;
                }
                throw new Error(errorDetails);
            }

            const result = await response.json();

            if (result.success) {
                alert(`Venta Completada y Registrada (ID: ${result.idVenta || 'N/A'}):\nTotal USD: $${totalUsd.toFixed(2)}\nTotal Bs: Bs ${totalBs.toFixed(2)}\nMétodo de Pago: ${paymentMethod}`);
                
                // Limpiar la venta solo si se registró con éxito
                saleItems = [];
                renderSaleItems(); // Limpia la lista en la UI
                paymentMethodSelect.value = ''; // Limpia el método de pago
            } else {
                alert(`Error al registrar la venta: ${result.error || 'Mensaje desconocido'}`);
                console.error('Error al registrar la venta:', result.error);
            }
        } catch (error) {
            alert(`Error de conexión o de red al registrar la venta: ${error.message}. Intenta de nuevo.`);
            console.error('Error al enviar la venta:', error);
        }
        // --- Fin de envío de datos ---
    });

    // ====================================================================
    // INICIALIZACIÓN
    // ====================================================================
    displayCurrentDate(); // Muestra la fecha al cargar la página
    fetchDailyRateFromBCV(); // Cargar la tasa del BCV al inicio
    fetchProductsFromInventory(); // Cargar los productos del inventario al inicio
    renderSaleItems(); // Asegura que la lista de venta esté vacía al inicio
});
