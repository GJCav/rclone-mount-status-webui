"use strict";

export default class RcloneAPI {
    constructor(options={
        alt_hostport: null,
    }) {
        self.alt_hostport = options.alt_hostport;
    }

    compose_url(path) {
        if (self.alt_hostport) {
            return `http://${self.alt_hostport}/${path}`;
        } else {
            return `/${path}`;
        }
    }

    async get_core_stats() {
        const url = this.compose_url("core/stats");
        const response = await fetch(url, {
            method: "POST"
        });
        const data = await response.json();
        return data;
    }

    async get_vfs_stats() {
        const url = this.compose_url("vfs/stats");
        const response = await fetch(url, {
            method: "POST"
        });
        const data = await response.json();
        return data;
    }
}