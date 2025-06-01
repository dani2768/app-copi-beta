document.addEventListener('DOMContentLoaded', () => {
    const fechaInput = document.getElementById('fecha');
    const tasaDiaInput = document.getElementById('tasa-dia');
    const productoSelect = document.getElementById('producto');
    const cantidadInput = document.getElementById('cantidad');
    const addToSaleBtn = document.getElementById('add-to-sale-btn');
    const completeSaleBtn = document.getElementById('complete-sale-btn');
    const itemsInSaleList = document.getElementById('items-in-sale-list');
    const totalUsdSpan = document.getElementById('total-usd');
    const totalBsSpan = document.getElementById('total-bs');
    const metodoPagoSelect = document.getElementById('metodo-pago'); // Referencia al select de método de pago

    let currentSaleItems = []; // Array para almacenar los productos en la venta

    // Establecer la fecha actual por defecto
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Meses son 0-index
    const day = String(today.getDate()).padStart(2, '0');
    fechaInput.value = `${year}-${month}-${day}`;

    // Función para actualizar los totales
    function updateTotals() {
        let totalUSD = 0;
        currentSaleItems.forEach(item => {
            totalUSD += item.price * item.quantity;
        });

        const tasaDelDia = parseFloat(tasaDiaInput.value);
        let totalBS = 0;
        if (!isNaN(tasaDelDia) && tasaDelDia > 0) {
            totalBS = totalUSD * tasaDelDia;
        }

        totalUsdSpan.textContent = `$${totalUSD.toFixed(2)}`;
        totalBsSpan.textContent = `Bs ${totalBS.toFixed(2)}`;
    }

    // Función para renderizar los items en la lista
    function renderSaleItems() {
        itemsInSaleList.innerHTML = ''; // Limpiar la lista actual
        currentSaleItems.forEach((item, index) => {
            const listItem = document.createElement('li');
            listItem.setAttribute('data-index', index); // Para identificar el item al eliminar

            listItem.innerHTML = `
                <span class="item-name">${item.name}</span>
                <span class="item-qty">x${item.quantity}</span>
                <span class="item-price">$${(item.price * item.quantity).toFixed(2)}</span>
                <i class="fas fa-trash-alt delete-item" title="Eliminar"></i>
            `;
            itemsInSaleList.appendChild(listItem);
        });
        updateTotals(); // Actualizar totales cada vez que la lista cambia
    }

    // Event listener para agregar producto a la venta
    addToSaleBtn.addEventListener('click', () => {
        const selectedOption = productoSelect.value;
        const cantidad = parseInt(cantidadInput.value);

        if (selectedOption && cantidad > 0) {
            const [name, priceStr] = selectedOption.split('|');
            const price = parseFloat(priceStr);

            // Verificar si el producto ya está en la lista para actualizar la cantidad
            const existingItemIndex = currentSaleItems.findIndex(item => item.name === name);

            if (existingItemIndex > -1) {
                currentSaleItems[existingItemIndex].quantity += cantidad;
            } else {
                currentSaleItems.push({
                    name: name,
                    price: price,
                    quantity: cantidad
                });
            }

            renderSaleItems();
            // Limpiar campos después de agregar
            productoSelect.value = ''; // Limpiar el select
            cantidadInput.value = '1';

        } else {
            alert('Por favor, selecciona un producto y una cantidad válida.');
        }
    });

    // Event listener para eliminar item de la lista (delegación de eventos)
    itemsInSaleList.addEventListener('click', (event) => {
        if (event.target.classList.contains('delete-item')) {
            const listItem = event.target.closest('li');
            const index = parseInt(listItem.getAttribute('data-index'));

            if (!isNaN(index) && index < currentSaleItems.length) {
                currentSaleItems.splice(index, 1); // Eliminar el item del array
                renderSaleItems(); // Volver a renderizar la lista
            }
        }
    });

    // Event listener para la tasa del día, para actualizar los totales cuando cambia
    tasaDiaInput.addEventListener('input', updateTotals);

    // Event listener para el botón "Completar Venta" (ejemplo)
    completeSaleBtn.addEventListener('click', () => {
        if (currentSaleItems.length === 0) {
            alert('No hay productos en la venta para completar.');
            return;
        }
        if (!metodoPagoSelect.value) { // Asegura que se haya seleccionado un método de pago
            alert('Por favor, selecciona un método de pago.');
            return;
        }

        const totalUSD = totalUsdSpan.textContent;
        const totalBS = totalBsSpan.textContent;
        const metodoPago = metodoPagoSelect.value;

        alert(`Venta completada!\nTotal USD: ${totalUSD}\nTotal Bs: ${totalBS}\nMétodo de Pago: ${metodoPago}\n(Aquí iría la lógica para guardar la venta)`);

        // Opcional: Limpiar la venta después de completarla
        currentSaleItems = [];
        renderSaleItems();
        metodoPagoSelect.value = ''; // Limpiar el select de método de pago
        productoSelect.value = '';
        cantidadInput.value = '1';
    });

    // Inicializar la lista y los totales al cargar la página
    renderSaleItems();
});