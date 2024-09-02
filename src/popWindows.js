function createSimpleModal(title, content = "") {
    // Create the container div
    const container = document.createElement('div');
    container.className = 'fixed top-0 right-0 left-0 z-30 flex justify-center w-full bg-transparent';

    // Create the popup div
    const popup = document.createElement('div');
    popup.className = 'shadow-RB fixed -top-72 max-w-96 min-h-32 z-30 rounded-2xl w-full bg-stone-900 p-5 transition-all duration-300';

    // Create the title h1
    const titleElement = document.createElement('h1');
    titleElement.className = 'mb-1 text-lg';
    titleElement.textContent = title;

    // Create the content pre element
    const contentElement = document.createElement('pre');
    contentElement.className = 'text-wrap whitespace-pre-wrap ml-2';
    contentElement.textContent = content;

    // Append the title and content to the popup
    popup.appendChild(titleElement);
    popup.appendChild(contentElement);

    // Append the popup to the container
    container.appendChild(popup);

    // Append the container to the body
    document.body.appendChild(container);

    setTimeout(() => {
        popup.classList.add("top-0")
        popup.classList.remove("-top-72")
    }, 100);
    setTimeout(() => {
        popup.classList.remove("top-0")
        popup.classList.add("-top-72")
    }, 3000);
    setTimeout(() => {
        document.body.removeChild(container);
    }, 6000);
}

function createConfirmModal(title, content = "", onConfirm, onCancel, confirm = "Confirm", cancel = "Cancel") {
    // Create the container div
    const container = document.createElement('div');
    container.className = 'fixed top-0 right-0 left-0 z-30 flex justify-center w-full bg-transparent';

    // Create the popup div
    const popup = document.createElement('div');
    popup.className = '-top-72 shadow-RB fixed max-w-96 min-h-32 z-30 rounded-2xl w-full bg-stone-900 p-5 transition-all duration-300';

    // Create the title h1
    const titleElement = document.createElement('h1');
    titleElement.className = 'mb-1 text-lg';
    titleElement.textContent = title;

    // Create the content pre element
    const contentElement = document.createElement('pre');
    contentElement.className = 'text-wrap whitespace-pre-wrap ml-2 min-h-7 ';
    contentElement.textContent = content;

    // Create the buttons container div
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'w-full flex justify-end space-x-4 mt-3';

    // Create the confirm button
    const confirmButton = document.createElement('button');
    confirmButton.className = 'cursor-pointer px-2 rounded-md bg-blue-500 hover:bg-blue-600';
    confirmButton.textContent = confirm;
    confirmButton.onclick = () => {
        onConfirm();
        document.body.removeChild(container); // Remove the popup after confirming
    };

    // Create the cancel button
    const cancelButton = document.createElement('button');
    cancelButton.className = 'cursor-pointer px-2 rounded-md bg-red-500 hover:bg-red-600';
    cancelButton.textContent = cancel;
    cancelButton.onclick = () => {
        onCancel();
        document.body.removeChild(container); // Remove the popup after canceling
    };

    // Append buttons to the buttons container
    buttonsContainer.appendChild(confirmButton);
    buttonsContainer.appendChild(cancelButton);

    // Append title, content, and buttons container to the popup
    popup.appendChild(titleElement);
    popup.appendChild(contentElement);
    popup.appendChild(buttonsContainer);

    // Append the popup to the container
    container.appendChild(popup);

    // Append the container to the body
    document.body.appendChild(container);

    setTimeout(() => {
        popup.classList.add("top-0")
        popup.classList.remove("-top-72")
    }, 100);
}