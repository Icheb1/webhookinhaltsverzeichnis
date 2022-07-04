(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
(function (global){(function (){
const { Webhook, MessageBuilder } = require('discord-webhook-node');
global.window.Webhook = Webhook;
global.window.MessageBuilder = MessageBuilder;
}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"discord-webhook-node":9}],3:[function(require,module,exports){
/* eslint-env browser */
module.exports = typeof self == 'object' ? self.FormData : window.FormData;

},{}],4:[function(require,module,exports){
const sendFile = require('./sendFile');
const sendWebhook = require('./sendWebhook');

module.exports = {
    sendFile,
    sendWebhook
};
},{"./sendFile":5,"./sendWebhook":6}],5:[function(require,module,exports){
const FormData = require('form-data');
const fs = require('fs');

module.exports = (hookURL, file, { username, avatar_url }) => new Promise((resolve, reject) => {
    const form = new FormData();

    if (username){
        form.append('username', username);
    };

    if (avatar_url){
        form.append('avatar_url', avatar_url);
    };

    form.append('file', fs.createReadStream(file));
    
    form.submit(hookURL, (error, response) => {
        if (error) reject(error);
        else resolve(response);
    });
});

},{"form-data":3,"fs":1}],6:[function(require,module,exports){
const fetch = require('node-fetch');

module.exports = (hookURL, payload) => new Promise((resolve, reject) => {
    fetch(hookURL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(res => resolve(res))
    .catch(err => reject(err));
});

},{"node-fetch":11}],7:[function(require,module,exports){
const { formatColor } = require('../utils');

module.exports = class MessageBuilder {
    constructor(){
        this.payload = {
            embeds: [{fields: []}]
        };
    };

    getJSON(){
        return this.payload;
    };

    setText(text){
        this.payload.content = text;

        return this;
    }

    setAuthor(author, authorImage, authorUrl){
        this.payload.embeds[0].author = {};
        this.payload.embeds[0].author.name = author;
        this.payload.embeds[0].author.url = authorUrl;   
        this.payload.embeds[0].author.icon_url = authorImage;  
         
        return this;
    };

    setTitle(title){
        this.payload.embeds[0].title = title;

        return this;
    };

    setURL(url){
        this.payload.embeds[0].url = url;

        return this;
    };

    setThumbnail(thumbnail){
        this.payload.embeds[0].thumbnail = {};
        this.payload.embeds[0].thumbnail.url = thumbnail;

        return this;
    };

    setImage(image){
        this.payload.embeds[0].image = {};
        this.payload.embeds[0].image.url = image;

        return this;
    };

    setTimestamp(date){
        if (date){
            this.payload.embeds[0].timestamp = date;
        }
        else {
            this.payload.embeds[0].timestamp = new Date();
        };

        return this;
    };

    setColor(color){
        this.payload.embeds[0].color = formatColor(color);

        return this;
    };

    setDescription(description){
        this.payload.embeds[0].description = description;

        return this;
    };

    addField(fieldName, fieldValue, inline){
        this.payload.embeds[0].fields.push({
            name: fieldName,
            value: fieldValue,
            inline: inline
        });

        return this;
    };

    setFooter(footer, footerImage){
        this.payload.embeds[0].footer = {};
        this.payload.embeds[0].footer.icon_url = footerImage;
        this.payload.embeds[0].footer.text = footer;

        return this;
    };
};
},{"../utils":10}],8:[function(require,module,exports){
const { sendWebhook, sendFile } = require('../api');
const MessageBuilder = require('./messageBuilder');

module.exports = class Webhook {
    constructor(options){
        this.payload = {};

        if (typeof options == 'string'){
            this.hookURL = options;
            this.throwErrors = true;
            this.retryOnLimit = true;
        }
        else {
            this.hookURL = options.url;
            this.throwErrors = options.throwErrors == undefined ? true : options.throwErrors;
            this.retryOnLimit = options.retryOnLimit == undefined ? true : options.retryOnLimit;
        };
    };

    setUsername(username){
        this.payload.username = username;

        return this;
    }

    setAvatar(avatarURL){
        this.payload.avatar_url = avatarURL;

        return this;
    }

    async sendFile(filePath){
        try {
            const res = await sendFile(this.hookURL, filePath, this.payload);

            if (res.statusCode != 200){
                throw new Error(`Error sending webhook: ${res.statusCode} status code.`);
            };
        }
        catch(err){
            if (this.throwErrors) throw new Error(err.message);
        };
    }

    async send(payload){
        let endPayload = {
            ...this.payload
        };

        if (typeof payload === 'string'){
            endPayload.content = payload;
        }
        else {
            endPayload = {
                ...endPayload,
                ...payload.getJSON()
            };
        };

        try {
            const res = await sendWebhook(this.hookURL, endPayload);

            if (res.status == 429 && this.retryOnLimit){
                const body = await res.json();
                const waitUntil = body["retry_after"];

                setTimeout(() => sendWebhook(this.hookURL, endPayload), waitUntil);
            }
            else if (res.status != 204){
                throw new Error(`Error sending webhook: ${res.status} status code. Response: ${await res.text()}`);
            };
        }
        catch(err){
            if (this.throwErrors) throw new Error(err.message);
        };
    };

    async info(title, fieldName, fieldValue, inline){
        const embed = new MessageBuilder()
        .setTitle(title)
        .setTimestamp()
        .setColor(4037805);

        if (fieldName != undefined && fieldValue != undefined){
            embed.addField(fieldName, fieldValue, inline)
        };        
        
        await this.send(embed);
    };

    async success(title, fieldName, fieldValue, inline){
        const embed = new MessageBuilder()
        .setTitle(title)
        .setTimestamp()
        .setColor(65340);

        if (fieldName != undefined && fieldValue != undefined){
            embed.addField(fieldName, fieldValue, inline)
        };

        await this.send(embed);
    }
    
    async warning(title, fieldName, fieldValue, inline){
        const embed = new MessageBuilder()
        .setTitle(title)
        .setTimestamp()
        .setColor(16763904);

        if (fieldName != undefined && fieldValue != undefined){
            embed.addField(fieldName, fieldValue, inline)
        };

        await this.send(embed);
    }


    async error(title, fieldName, fieldValue, inline){
        const embed = new MessageBuilder()
        .setTitle(title)
        .setTimestamp()
        .setColor(16729149);

        if (fieldName != undefined && fieldValue != undefined){
            embed.addField(fieldName, fieldValue, inline)
        };

        await this.send(embed);
    }
};

},{"../api":4,"./messageBuilder":7}],9:[function(require,module,exports){
const Webhook = require('./classes/webhook');
const MessageBuilder = require('./classes/messageBuilder');

module.exports = {
    Webhook,
    MessageBuilder
};

},{"./classes/messageBuilder":7,"./classes/webhook":8}],10:[function(require,module,exports){
exports.formatColor = (color) => {
    if (typeof color === 'string' && color.startsWith("#")){
        const rawHex = color.split('#')[1];

        return parseInt(rawHex, 16);
    }
    else {
        return Number(color);
    };
};
},{}],11:[function(require,module,exports){
(function (global){(function (){
"use strict";

// ref: https://github.com/tc39/proposal-global
var getGlobal = function () {
	// the only reliable means to get the global object is
	// `Function('return this')()`
	// However, this causes CSP violations in Chrome apps.
	if (typeof self !== 'undefined') { return self; }
	if (typeof window !== 'undefined') { return window; }
	if (typeof global !== 'undefined') { return global; }
	throw new Error('unable to locate global object');
}

var global = getGlobal();

module.exports = exports = global.fetch;

// Needed for TypeScript and Webpack.
if (global.fetch) {
	exports.default = global.fetch.bind(global);
}

exports.Headers = global.Headers;
exports.Request = global.Request;
exports.Response = global.Response;
}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}]},{},[2]);
