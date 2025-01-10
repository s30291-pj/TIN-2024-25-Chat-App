var application;

function connect() {
    application = new App();

    let usernameElement = document.getElementById("connect-username")
    let passphraseElement = document.getElementById("connect-passphrase");
    let serverElement = document.getElementById("connect-server");
    let errorElement = document.getElementById("connect-error");

    let username = usernameElement.value;
    let passphrase = passphraseElement.value;
    let server = serverElement.value;

    if (!isCredentialsValid(username, passphrase)) {
        errorElement.innerHTML = "<b>Error!</b> You have to provide a correct username and passphrase(more than 6 characters each)";
        errorElement.classList.add("active");
        return;
    }

    errorElement.classList.remove("active");

    passphraseElement.value = "";

    application.init(new Credentials(username, passphrase), server);
    closeDialog();
}

async function onConnectDialogInput() {
    let username = document.getElementById("connect-username").value;
    let passphrase = document.getElementById("connect-passphrase").value;

    let element = document.getElementById("connect-identifier");

    if (isCredentialsValid(username, passphrase)) {
        element.innerHTML = await hash(username + passphrase);
    }
    else {
        element.innerHTML = "Unknown for now!"
    }
}

function isCredentialsValid(username, passphrase) {
    username = String(username).trim();
    return (username !== "" && username.length >= 4 && passphrase.length >= 6);
}

function logout() {
    if(application == null) return;

    application.logout();

    application = null;

    showConnectDialog();

    document.getElementById("chat-window").classList.remove("active");
    document.getElementById("messages").replaceChildren();
}

function showConnectDialog() {
    showDialog("connect-dialog");
}

function showInviteDialog() {
    showDialog("invite-dialog");
}

function showDialog(id) {
    let wrapper = document.getElementById("dialogs-wrapper");

    for (i = 1; i < wrapper.children.length; i++) {
        let child = wrapper.children.item(i);
        if(child.id === id) {
            child.classList.add("active");
        }
        else {
            child.classList.remove("active");
        }
    }

    wrapper.classList.add("active");
}

function closeDialog() {
    let wrapper = document.getElementById("dialogs-wrapper");

    wrapper.classList.remove("active");
}