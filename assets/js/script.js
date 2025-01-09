class Credentials {
    #username;
    #passphrase;
    #hash;

    #rehashNeeded = true;

    constructor(username, passphrase) {
        this.#username = username;
        this.#passphrase = passphrase;
    }

    get username() {
        return this.#username;
    }

    get passphrase() {
        return this.#passphrase;
    }

    set username(value) {
        this.#username = value;
        this.#rehashNeeded = true;
    }

    set passphrase(value) {
        this.#passphrase = value;
        this.#rehashNeeded = true;
    }

    async getHash() {
        if (this.#rehashNeeded) {
            this.#hash = await hash(this.username + this.passphrase);
        }

        return this.#hash;
    }
}

class Contact {
    username;
    identifier;

    constructor(username, identifier) {
        this.username = username;
        this.identifier = identifier;
    }

    contains(search) {
        return this.username.toLowerCase().includes(search) ||  
            (search.length >= 64 && ("#" + this.identifier).toLowerCase().includes(search));
    }
}

class Message {
    sender;
    content;
    timestamp;

    constructor(sender, content, timestamp) {
        this.sender = sender;
        this.content = content;
        this.timestamp = timestamp;
    }
}

class App {
    accountContainer = new AccountContainer(this);
    contactsContainer = new ContactsContainer(this);
    chatContainer = new ChatContainer(this);

    credentials;

    async init(credentials) {
        if(credentials instanceof Credentials) {
            this.credentials = credentials;

            let username = credentials.username;
            let hash = await credentials.getHash();

            this.accountContainer.initEvents();
            this.accountContainer.update(username, hash)
            
            this.contactsContainer.initEvents();
            await this.contactsContainer.fetch(credentials);
            this.contactsContainer.display();
        }
    }
}

class AccountContainer {
    username;
    identifier;
    app;

    constructor(app) {
        this.app = app;
    }

    initEvents() {
        let element = document.getElementById("account-identifier-copy");
        
        element.addEventListener("click", event => {
            copyToClipboard("#" + this.identifier);
        })
    }
    
    update(username, identifier) {
        this.username = username;
        this.identifier = identifier;

        this.updateUsername(username);
        this.updateIdentifier(identifier);
        this.updateAvatar(identifier);
    }

    updateUsername() {
        let element = document.getElementById("account-name");
        element.innerHTML = this.username;
    }

    updateIdentifier() {
        let element = document.getElementById("account-identifier");
        element.innerHTML = "#" + this.identifier;
    }

    updateAvatar() {
        let element = document.getElementById("account-img");
        element.src = getAvatarImage(this.identifier);
    }
}

class ContactsContainer {
    contacts = [];
    app;

    constructor(app) {
        this.app = app;
    }

    initEvents() {
        let searchInput = document.getElementById("search-contact-input");
        searchInput.addEventListener("input", (event) => {
            console.log("test");
            this.display(event.target.value);
        })
    }

    async fetch(credentials) {
        if(credentials instanceof Credentials) {
            this.contacts = [new Contact("test", await hash("test2")), new Contact("Andrzej", await hash("andrzej")), new Contact("Filip", await hash("filip"))];
        }
    }

    display(filter) {
        let container = document.getElementById("contact-list");
        let filtered = this.contacts.filter((c) => (filter != null) ? c.contains(filter.toLowerCase()) : true);
        
        container.replaceChildren();

        console.log(filter);
        console.log(filtered);

        filtered.forEach((c) => {
            let element = this.contactElementFactory(c.username, c.identifier);
            
            element.addEventListener("click", (event) => {
                let searchInput = document.getElementById("search-contact-input");
                searchInput.value = "";
                
                this.app.chatContainer.open(c);
                this.display();
            })

            let chatReceiver = this.app.chatContainer.receiver;

            if (chatReceiver != null && chatReceiver.identifier === c.identifier) {
                element.classList.add("selected");
            }

            container.append(element);
        })

        if(filtered.length == 0) {
            let message = document.createElement("small");
            message.innerHTML = "No contact found!";

            container.append(message);
        }
    }

    contactElementFactory = function(username, identifier) {
        let contactImg = document.createElement("img");
        contactImg.classList.add("avatar-img");
        contactImg.src = getAvatarImage(identifier);

        let contactName = document.createElement("h4");
        contactName.classList.add("name");
        contactName.innerText = username;

        let contactIdentifier = document.createElement("h6");
        contactIdentifier.classList.add("identifier");
        contactIdentifier.innerText = "#" + identifier;

        let contactContainer = document.createElement("div");
        contactContainer.classList.add("contact");
        contactContainer.id = `contact-${identifier}`;
        contactContainer.append(contactImg, contactName, contactIdentifier);

        return contactContainer;
    }

}

class ChatContainer {
    receiver;
    history = [];
    app;

    isOpen = false;

    constructor(app) {
        this.app = app;
    }

    initEvents() {
        let identifierCopy = document.getElementById("chat-receiver-identifier-copy");

        identifierCopy.addEventListener("click", event => {
            copyToClipboard("#" + this.receiver.identifier);
        })

        let chatInput = document.getElementById("message-input");
        chatInput.addEventListener("keypress", function (event) {
            if (event.key === "Enter") {
                event.preventDefault();
                document.getElementById("message-send-button").click();
            }
        });

        let chatSendButton = document.getElementById("message-send-button");
        chatSendButton.addEventListener("click", event => {
            let input = document.getElementById("message-input");
            
            let text = String(input.value).trim();
            
            if(text !== "") { 
                this.send(text);
                input.value = "";
            }
        })
    }

    async open(contact) {
        if (this.receiver != null && this.receiver.identifier === contact.identifier) return;
        this.receiver = contact;

        let chatInput = document.getElementById("message-input");
        chatInput.value = "";

        if (!this.isOpen) {
            this.initEvents();
            this.isOpen = true;
        }

        let chatWindow = document.getElementById("chat-window");
        chatWindow.classList.add("active");

        this.updateReceiverDetails();

        await this.fetch();
        this.showMessages();
    }

    async fetch() {
        this.history = [
            new Message(this.receiver.identifier, "This is a message!", new Date().getTime())
        ];
    }

    updateReceiverDetails() {
        let avatarElement = document.getElementById("chat-receiver-img")
        avatarElement.src = getAvatarImage(this.receiver.identifier);

        let nameElement = document.getElementById("chat-receiver-name")
        nameElement.innerHTML = this.receiver.username;

        let identifierElement = document.getElementById("chat-receiver-identifier")
        identifierElement.innerHTML = "#" + this.receiver.identifier;
    }

    showMessages() {
        let chatContainer = document.getElementById("messages");

        chatContainer.replaceChildren();

        this.history.forEach(msg => {
            this.showMessage(msg, chatContainer);
        });
    }

    addMessage(message) {
        this.history += message;
        this.showMessage(message);
    }

    showMessage(message, container) {
        if (container == null) {
            container = document.getElementById("messages");
        }

        let msgElement = this.messageElementFactory(message);
        
        container.append(msgElement);

        msgElement.scrollIntoView({behavior: "smooth"});
    }

    messageElementFactory(message) {
        if(message instanceof Message) {
            let messageAvatar = document.createElement("img");
            messageAvatar.classList.add("avatar-img");
            messageAvatar.src = getAvatarImage(message.sender);

            let messageContent = document.createElement("p");
            messageContent.innerHTML = message.content;

            let messageTimestamp = document.createElement("small");
            
            let date = new Date(message.timestamp);

            const minutes = String(date.getMinutes()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');

            messageTimestamp.innerHTML = `${hours}:${minutes}`;

            let messageContainer = document.createElement("div");
            messageContainer.classList.add("message");
            messageContainer.append(messageAvatar);
            messageContainer.append(messageContent);
            messageContainer.append(messageTimestamp);

            if(!(message.sender === this.receiver.identifier)) {
                messageContainer.classList.add("sender");
            }

           return messageContainer;
        }
    }

    receive(message) {
        if(message instanceof Message) {
            this.addMessage(message);
        }
    }

    async send(text) {
        let message = new Message(await this.app.credentials.getHash(), text, new Date().getTime());
        this.addMessage(message);
    }
}

var app

window.onload = function() { 
    app = new App();
    app.init(new Credentials("Test", "test"));
}

async function hash(string) {
    const utf8 = new TextEncoder().encode(string);
    const hashBuffer = await crypto.subtle.digest('SHA-256', utf8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
        .map((bytes) => bytes.toString(16).padStart(2, '0'))
        .join('');
    return hashHex;
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
}

function getAvatarImage(seed) {
    return `https://api.dicebear.com/9.x/identicon/svg?seed=${seed}&size=32`;
}

function switchTheme() {
    let site = document.getElementById("site");

    if (site.classList.contains("dark")) {
        site.classList.remove("dark");
    }
    else site.classList.add("dark");
}



