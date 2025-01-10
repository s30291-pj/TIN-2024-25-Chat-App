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
    socketHandler = new ChatSocketHandler();

    async init(credentials, address) {
        if(credentials instanceof Credentials) {
            this.credentials = credentials;
            this.address = address;

            this.socketHandler.connect(address, credentials);
            this.socketHandler.onrequest = (req) => this.handle(req);

            let username = credentials.username;
            let hash = await credentials.getHash();

            this.accountContainer.initEvents();
            this.accountContainer.update(username, hash)
            
            this.contactsContainer.initEvents();
            await this.contactsContainer.fetch(credentials);
            this.contactsContainer.display();
        }
    }

    async handle(request) {
        if(request instanceof ChatContactEstablishedRequest) {
            this.contactsContainer.add(new Contact(request.username, request.identifier));
        }
        else if(request instanceof ChatMessageReceivedRequest) {
            if (this.chatContainer.isOpen && await this.chatContainer.getChatIdentifier() === request.chat) {
                let msg = new Message(request.sender, request.content, request.timestamp);
                this.chatContainer.receive(msg);
            }
            else {
                this.contactsContainer.contacts.forEach((c) => {
                    if(c.identifier === request.sender) {
                        if (c.unread == null) {
                            c.unread = 0;
                        }
                        
                        c.unread += 1;

                        let contactElement = document.getElementById(`contact-${c.identifier}`);
                        
                        console.log(contactElement);

                        let unreadElement = contactElement.children.item(3);
                        
                        unreadElement.classList.add("active");
                        unreadElement.innerHTML = c.unread;
                    }
                })
            }
        }
    }

    logout() {
        this.socketHandler.close();
    }
}

class AccountContainer {
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

    constructor(app) {
        this.app = app;
    }

    initEvents() {
        let searchInput = document.getElementById("search-contact-input");
        searchInput.addEventListener("input", (event) => {
            this.display(event.target.value);
        })

        let addContactButton = document.getElementById("add-contact-button");
        addContactButton.addEventListener("click", (event) => {
            let inputElement = document.getElementById("invitation-input");
            let errorElement = document.getElementById("invitation-error");

            inputElement.value = "";
            errorElement.value = "";

            errorElement.classList.remove("active");

            showInviteDialog();
        });

        let inviteButton = document.getElementById("invite-button");
        inviteButton.addEventListener("click", (event) => {
            let inputElement = document.getElementById("invitation-input");
            let errorElement = document.getElementById("invitation-error");

            let receiver = inputElement.value.trim().replaceAll("#", "");

            if (receiver.length != 64) {
                errorElement.innerHTML = "<b>Error!</b> You have provided a wrong identifier!";
                errorElement.classList.add("active");
                return;
            }
            
            this.invite(receiver);

            closeDialog();
        })
    }

    async fetch(credentials) {
        if(credentials instanceof Credentials) {
            this.contacts = await (await fetch(`${this.app.address}contacts`, {
                method: "POST",
                body: JSON.stringify({username: credentials.username, passphrase: credentials.passphrase})
            })).json();
        }
    }

    display(filter) {
        let container = document.getElementById("contact-list");

        if (filter != null) filter = String(filter).toLowerCase();

        let filtered = this.contacts.filter((c) => {
            return (filter != null)
                ? String(c.username).toLowerCase().includes(filter) ||
                (filter.length >= 64 && String(("#" + c.identifier)).toLowerCase().includes(filter))
                : true;
        });
        
        container.replaceChildren();

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

    add(contact) {
        if(contact instanceof Contact) {
            this.contacts.push(contact);
            this.display();
        }
    }

    invite(identifier) {
        let request = new ChatContactInviteRequest(identifier);
        this.app.socketHandler.send(request);
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
        
        let contactUnreadMessages = document.createElement("h4");
        contactUnreadMessages.classList.add("unread-messages");

        let contactContainer = document.createElement("div");
        contactContainer.classList.add("contact");
        contactContainer.id = `contact-${identifier}`;
        contactContainer.append(contactImg, contactName, contactIdentifier, contactUnreadMessages);

        return contactContainer;
    }

}

class ChatContainer {
    history = [];

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
    
    async fetch(credentials, receiverId) {
        this.history = await (await fetch(`${this.app.address}chat`, {
            method: "POST",
            body: JSON.stringify({ username: credentials.username, passphrase: credentials.passphrase, receiver: receiverId })
        })).json();
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

        let contactElement = document.getElementById(`contact-${contact.identifier}`);
        let unreadElement = contactElement.children.item(3);

        contact.unread = 0;

        unreadElement.classList.remove("active");

        this.updateReceiverDetails();

        await this.fetch(this.app.credentials, this.receiver.identifier);
        this.showMessages();
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

        var lastMsg;

        this.history.forEach(msg => {
            lastMsg = this.showMessage(msg, chatContainer);
        });

        if (lastMsg != null) lastMsg.scrollIntoView();
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
        return msgElement;
    }

    async getChatIdentifier() {
        return getChatIdentifier(this.receiver.identifier, await this.app.credentials.getHash());
    }

    messageElementFactory(message) {
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

    receive(message) {
        if(message instanceof Message) {
            this.addMessage(message);
        }
    }

    async send(text) {
        let message = new Message(await this.app.credentials.getHash(), text, new Date().getTime());
        
        let request = new ChatMessageSentRequest(this.receiver.identifier, message.sender, message.content, message.timestamp);

        this.app.socketHandler.send(request);
        
        this.addMessage(message);
    }
}

function getChatIdentifier(identifier1, identifier2) {
    let sorted = [identifier1, identifier2].sort();
    
    return sorted[0] + sorted[1];
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



