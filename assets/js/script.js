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


class App {
    accountContainer = new AccountContainer();
    contactsContainer = new ContactsContainer;

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
        element.setAttribute("src", getAvatarImage(this.identifier));
    }
}

class ContactsContainer {
    contacts = [];

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
        contactImg.setAttribute("src", getAvatarImage(identifier));

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

}


window.onload = function() {
    var app = new App();

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



