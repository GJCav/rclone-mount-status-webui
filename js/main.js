"use strict";

import { createApp, reactive, ref } from 'vue'
import RCAPI from './rclone_api.js'
import * as R from './readable.js'

createApp({
    data() {return {
        config: {
            // server_loc: '127.0.0.1:5572' // for testing
            server_loc: '', // works with the same host with rclone
        },

        BUSY_NO: 0,
        BUSY_YES: 1,
        BUSY_UNKNOWN: 2,
        general: {
            state: "OK",
            last_update: "2021-09-01 00:00:00",
            running_time: 0,
            tot_bytes: '0'
        },

        vfs: {
            busy: 0,
            uploads_in_proc: 0,
            uploads_in_queue: 0,
            disk_used: 51,
            disk_out_of_space: 23,
        },

        transfers: [],

        update_timer: null,
        rc_api: null,
    }},

    methods: {
        async __update() {
            const api = this.rc_api;
            const core_stats = await api.get_core_stats() || {};
            const vfs_stats = await api.get_vfs_stats() || {};
            
            // Update general stats
            let uptime = core_stats.elapsedTime;
            if (uptime === undefined || uptime === null) {
                uptime = 'N/A';
            } else {
                uptime = R.second2hms(uptime);
            }
            this.general.running_time = uptime;

            let tot_bytes = core_stats.bytes;
            if (tot_bytes === undefined || tot_bytes === null) {
                tot_bytes = 'N/A';
            } else {
                tot_bytes = R.bytes2human(tot_bytes);
            }
            this.general.tot_bytes = tot_bytes;

            // Update VFS stats
            let upload_in_progress = vfs_stats.diskCache?.uploadsInProgress;
            if (upload_in_progress === undefined || upload_in_progress === null) {
                this.vfs.busy = this.BUSY_UNKNOWN;
                this.vfs.uploads_in_proc = 'N/A';
                upload_in_progress = undefined;
            } else {
                this.vfs.uploads_in_proc = upload_in_progress;
            }

            let upload_in_queue = vfs_stats.diskCache?.uploadsQueued;
            if (upload_in_queue === undefined || upload_in_queue === null) {
                this.vfs.busy = this.BUSY_UNKNOWN;
                this.vfs.uploads_in_queue = "N/A";
                upload_in_queue = undefined;
            } else {
                this.vfs.uploads_in_queue = upload_in_queue;
            }

            let disk_used = vfs_stats.diskCache?.bytesUsed;
            if (disk_used === undefined || disk_used === null) {
                this.vfs.disk_used = "N/A";
            } else {
                this.vfs.disk_used = R.bytes2human(disk_used);
            }

            let disk_out_of_space = vfs_stats.diskCache?.outOfSpace;
            if (disk_out_of_space === null || disk_out_of_space === undefined) {
                this.vfs.disk_out_of_space = "N/A";
            } else {
                this.vfs.disk_out_of_space = disk_out_of_space ? "Yes" : "No";
            }

            // Busy condition
            const busy_conditions = [
                upload_in_progress,
                upload_in_queue,
            ];
            let busy = null;
            if(busy_conditions.some(condition => condition === undefined)) {
                busy = this.BUSY_UNKNOWN;
            } else if(busy_conditions.every(condition => condition === 0)) {
                busy = this.BUSY_NO;
            } else {
                busy = this.BUSY_YES;
            }
            this.vfs.busy = busy;

            // Upload tranfsering
            const transfers = core_stats.transferring || [];
            this.transfers = transfers.map(transfer => {
                const name = transfer.name;
                const transfered = R.bytes2human(transfer.bytes, 'short');
                const total = R.bytes2human(transfer.size, 'short');
                const percent = Math.floor(transfer.percentage);
                const tag1 = `${transfered}/${total} (${percent}%)`;

                const speed = R.bytes2human(transfer.speedAvg, 'short');
                const tag2 = `${speed}/s`;

                let eta = 'N/A'
                if (transfer.eta === undefined || transfer.eta === null){
                    eta = 'N/A';
                } else {
                    eta = R.second2hms(transfer.eta)
                }

                return {
                    path: name,
                    tags: [tag1, tag2, eta]
                }
            })
        },

        async update() {
            try {
                this.general.last_update = new Date().toLocaleString()
                this.general.state = 'Updating...'
                await this.__update();
                this.general.state = 'OK';
                return true;
            } catch (err) {
                console.error(err)
                this.general.state = `Failed, ${err}`;
                return false;
            }
        }
    },

    mounted() {
        this.rc_api = new RCAPI({alt_hostport: this.config.server_loc});
        const that = this;
        this.update().then(function(r) {
            if (r) {
                that.update_timer = setInterval(that.update, 1000);
            }
        });
    }
}).mount('#app')