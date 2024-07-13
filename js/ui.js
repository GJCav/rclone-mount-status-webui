'use strict';

import * as Readable from "./readable.js";

export const collection2array = (html_collection) => {
    return Array.prototype.slice.call(html_collection);
}

export class TagBuilder {
    constructor(tag) {
        this.tag = tag;
        this.element = document.createElement(tag);
    }

    innerHTML(html) {
        this.element.innerHTML = html;
        return this;
    }

    innerText(text) {
        this.element.innerText = text;
        return this;
    }

    appendChild(child) {
        this.element.appendChild(child);
        return this;
    }

    setAttribute(name, value) {
        this.element.setAttribute(name, value);
        return this;
    }

    build() {
        return this.element;
    }
}

export class InfoList {
    constructor(mount_on) {
        /** @type {HTMLElement} */
        this.mount_on = mount_on;
    }

    get data() {
        let data = [];
        let children = collection2array(this.mount_on.children);
        children.forEach((e, idx) => {
            if(idx % 2 === 0) {
                let key = e.innerText;
                let value = children[idx + 1].innerText;
                data.push({key, value});
            }
        });
        return data;
    }

    set data(new_data) {
        new_data = new_data || [];

        let new_map = {};
        new_data.forEach((e) => {
            new_map[e.key] = e.value;
        });

        let child_map = {};
        let to_remove = [];
        collection2array(this.mount_on.children).forEach((e, idx) => {
            if(idx % 2 === 0) {
                let key = e.innerText;

                if (!new_map[key]) {
                    to_remove.push(e);
                    to_remove.push(this.mount_on.children[idx + 1]);
                } else {
                    child_map[key] = this.mount_on.children[idx + 1];
                }
            }
        });

        // remove deleted items
        to_remove.forEach((e) => {
            this.mount_on.removeChild(e);
        });

        // update or add new items
        for (let item of new_data) {
            let key = item.key;
            let value = item.value;
            if (child_map[key]) {
                child_map[key].innerText = value;
            } else {
                this.mount_on.appendChild((new TagBuilder('div')
                    .innerText(key).build()));
                this.mount_on.appendChild((new TagBuilder('div')
                    .innerText(value).build()));
            }
        }
    }

    patch(key, value) {
        const new_data = this.data;
        let idx = new_data.findIndex((e) => e.key === key);
        if(idx === -1) {
            new_data.push({key, value});
        } else {
            new_data[idx].value = value;
        }
        this.data = new_data;
    }
}

export class TransferCard {
    constructor(mount_on) {
        /** @type {HTMLElement} */
        this.mount_on = mount_on;

        this.__default_data = () => ({
            name: "",
            bytes: 0, // tranferred bytes
            size: 0,  // total size
            percentage: 0, // percentage of completion
            speedAvg: 0,   // per second as an exponentially weighted moving average
            eta: null,     // estimated time in seconds until file transfer completion
        })

        this.__data = this.__default_data();

        this.__render();
    }

    get data() {
        return {...this.__data};
    }

    set data(new_value) {
        for (let key in this.__default_data()) {
            if (new_value[key] === undefined) {
                throw new Error(`Missing key: ${key}`);
            }
        }

        this.__data = new_value;
        this.__update();
    }

    get filename() {
        return this.__data.name;
    }

    __render() {
        const container = this.mount_on;
        container.innerHTML = "";

        this.__name = (new TagBuilder('h5')).innerText("filename").build();
        this.__progress_tag = (new TagBuilder('li')).innerText("12MB/100MB").build();
        this.__speed_tag = (new TagBuilder('li')).innerText("12MB/s").build();
        this.__eta_tag = (new TagBuilder('li')).innerText("ETA: 1s").build();

        container.appendChild(this.__name);
        container.appendChild((new TagBuilder('ul'))
            .setAttribute("class", "tag_list")
            .appendChild(this.__progress_tag)
            .appendChild(this.__speed_tag)
            .appendChild(this.__eta_tag)
            .build()
        );
    }

    __update() {
        let data = this.data;
        this.__name.innerText = data.name;

        const transferred = Readable.bytes2human(data.bytes, "short");
        const total = Readable.bytes2human(data.size, "short");
        const percentage = Math.floor(data.percentage);
        this.__progress_tag.innerText = `${transferred}/${total} (${percentage}%)`;

        const speed = Readable.bytes2human(data.speedAvg, "short");
        this.__speed_tag.innerText = `${speed}/s`;

        let eta = "N/A";
        if (data.eta == null) {
            eta = "N/A";
        } else {
            eta = Readable.second2hms(data.eta);
        }
        this.__eta_tag.innerText = `ETA: ${eta}`;
    }
}


export class TransferList {
    constructor(mount_on) {
        /** @type {HTMLElement} */
        this.mount_on = mount_on;
        this.mount_on.innerHTML = "";

        this.__transfers = [];
    }

    get data() {
        return this.__transfers.map((e) => e.data);
    }

    /**
     * @param {Array} array of dicts
     */
    set data(new_transfers) {
        const old_transfers = this.__transfers; // array of TransferCard

        const new_map = {};
        new_transfers.forEach((e) => {
            new_map[e.name] = e;
        });

        const old_map = {};
        const to_remove = [];
        old_transfers.forEach((e) => { // e is TransferCard
            if (!new_map[e.filename]) {
                to_remove.push(e);
            } else {
                old_map[e.filename] = e;
            }
        });

        // remove deleted items
        to_remove.forEach((e) => {
            this.__transfers.splice(this.__transfers.indexOf(e), 1);
            this.mount_on.removeChild(e.mount_on);
        });

        // update or add new items
        for (let item of new_transfers) { // item is dict
            let filename = item.name;
            if (old_map[filename]) {
                old_map[filename].data = item;
            } else {
                const new_dom = (
                    new TagBuilder('div')
                    .setAttribute("class", "transfer_container")
                ).build();
                this.mount_on.appendChild(new_dom);
                const card = new TransferCard(new_dom);
                card.data = item;
                this.__transfers.push(card);
            }
        }
    }
}