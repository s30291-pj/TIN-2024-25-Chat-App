class ChatRequest {
    constructor(name) {
        if (typeof name === 'string') {
            this.name = name;
        }
    }

    toJson() {
        return JSON.stringify(this);
    }
}

class ChatAuthRequest extends ChatRequest {
    constructor(username, passphrase) {
        super("chat_auth");
        this.username = username;
        this.passphrase = passphrase;
    }
}

class ChatAuthEstablishedRequest extends ChatRequest {
    constructor(session) {
        super("chat_auth_established");
        this.session = session;
    }
}

class ChatContactInviteRequest extends ChatRequest {
    constructor(identifier) {
        super("chat_contact_invite");
        this.identifier = identifier;
    }
}

class ChatMessageSentRequest extends ChatRequest {
    constructor(receiver, sender, content, timestamp) {
        super("chat_message_sent");
        this.receiver = receiver;
        this.sender = sender;
        this.content = content;
        this.timestamp = timestamp;
    }
}

class ChatMessageReceivedRequest extends ChatRequest {
    constructor(chat, sender, content, timestamp) {
        super("chat_message_received");
        this.chat = chat;
        this.sender = sender;
        this.content = content;
        this.timestamp = timestamp;
    }
}

class ChatContactEstablishedRequest extends ChatRequest {
    constructor(username, identifier) {
        super("chat_contact_established");
        this.username = username;
        this.identifier = identifier;
    }
}

class ChatSocketHandler {
    onrequest = function(request) {};

    connect(address, credentials) {
        if (this.socket != null) socket.close();

        this.credentials = credentials;
        this.session = null;
        this.address = String(address).replace("http", "ws");
        this.socket = new WebSocket(`${this.address}session`);

        this.socket.addEventListener("open", (event) => {
            this.connectionOpen();
        });

        this.socket.addEventListener("message", (event) => {
            this.connectionMessage(event.data);
        });
    }

    handle(json) {
        var parsed = JSON.parse(json);
        var request;

        if (parsed.name === "chat_auth_established") {
            request = new ChatAuthEstablishedRequest(parsed.session);
            this.session = request.session;
        } else if (parsed.name === "chat_contact_established") {
            request = new ChatContactEstablishedRequest(parsed.username, parsed.identifier);
        } else if (parsed.name === "chat_message_received") {
            request = new ChatMessageReceivedRequest(parsed.chat, parsed.sender, parsed.content, parsed.timestamp);
        } else {
            console.log(`Received unknown request! ${parsed}`);
        }
        
        this.onrequest(request);
    }

    connectionMessage(data) {
        console.log(`Received message from session server: ${data}`);
        this.handle(data);
    }

    connectionOpen() {
        console.log(`Created connection with session server: ${this.address}`);

        this.send(new ChatAuthRequest(this.credentials.username, this.credentials.passphrase));
    }

    send(request) {
        if(request instanceof ChatRequest) {
            this.socket.send(request.toJson());
        }
    }

    close() {
        this.socket.close();
    }
}