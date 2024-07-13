"use strict";
import {InfoList, TransferCard, TransferList} from "./ui.js";
import RcloneAPI from "./rclone_api.js";
import * as Readable from "./readable.js";

const target = "localhost:5572";

const api = new RcloneAPI({
    alt_hostport: target
});

const general_list_dom = document.getElementById("general");
const general_list = new InfoList(general_list_dom);
general_list.data = [
    {key: "Target", value: target},
    {key: "Connection", value: "OK"},
    {key: "Last Update", value: "2021-07-01 12:00:00"},
    {key: "Running Time", value: "1d 2h 3m 4s"},
    {key: "Total Bytes", value: "1.255 GB"},
];

const vfs_list_dom = document.getElementById("vfs");
const vfs_list = new InfoList(vfs_list_dom);
vfs_list.data = [
    {key: "Busy", value: "Unknown"},
    {key: "Uploads In Progress", value: "0"},
    {key: "Uploads In Queue", value: "0"},
    {key: "Disk Used", value: "0"},
    {key: "Disk Out of Space", value: "0"},
];

const transfer_list_dom = document.getElementById("transfer");
const transfer_list = new TransferList(transfer_list_dom);

async function update() {
    general_list.patch("Last Update", new Date().toLocaleString());

    const core_stats = await api.get_core_stats() || {};
    const vfs_stats = await api.get_vfs_stats() || {};
    
    general_list.patch("Connection", "OK");
    
    // Update general stats
    let uptime = core_stats.elapsedTime;
    if (uptime === undefined || uptime === null) {
        uptime = "N/A";
    } else {
        uptime = Readable.second2hms(uptime);
    }
    general_list.patch("Running Time", uptime);

    let tot_bytes = core_stats.bytes;
    if (tot_bytes === undefined || tot_bytes === null) {
        tot_bytes = "N/A";
    } else {
        tot_bytes = Readable.bytes2human(tot_bytes);
    }
    general_list.patch("Total Bytes", tot_bytes);

    // Update VFS stats
    let upload_in_progress = vfs_stats.diskCache?.uploadsInProgress;
    if (upload_in_progress === undefined || upload_in_progress === null) {
        vfs_list.patch("Busy", "Unknown");
        vfs_list.patch("Uploads In Progress", "N/A");
        upload_in_progress = undefined;
    } else {
        vfs_list.patch("Uploads In Progress", upload_in_progress.toString());
    }
    
    let upload_in_queue = vfs_stats.diskCache?.uploadsQueued;
    if (upload_in_queue === undefined || upload_in_queue === null) {
        vfs_list.patch("Busy", "Unknown");
        vfs_list.patch("Uploads In Queue", "N/A");
        upload_in_queue = undefined;
    } else {
        vfs_list.patch("Uploads In Queue", upload_in_queue.toString());
    }

    let disk_used = vfs_stats.diskCache?.bytesUsed;
    if (disk_used === undefined || disk_used === null) {
        vfs_list.patch("Disk Used", "N/A");
        disk_used = undefined;
    } else {
        disk_used = Readable.bytes2human(disk_used);
    }
    vfs_list.patch("Disk Used", disk_used);

    let disk_out_of_space = vfs_stats.diskCache?.outOfSpace;
    if (disk_out_of_space === null || disk_out_of_space === undefined) {
        vfs_list.patch("Disk Out of Space", "N/A");
        disk_out_of_space = undefined;
    } else {
        vfs_list.patch(
            "Disk Out of Space", disk_out_of_space ? "Yes" : "No");
    }

    const busy_conditions = [
        upload_in_progress,
        upload_in_queue,
    ];
    let busy = null;
    if(busy_conditions.some(condition => condition === undefined)) {
        busy = "Unknown";
    } else if(busy_conditions.every(condition => condition === 0)) {
        busy = "No, safe to exit";
    } else {
        busy = "Yes";
    }
    vfs_list.patch("Busy", busy);

    // Update transfering
    const transfer_data = core_stats.transferring || [];
    const count = transfer_data.length;
    if (count == 0) {
        document.getElementById("transferring_title").innerText = `No transferring`;
    } else {
        document.getElementById("transferring_title").innerText = `Transferring ${count} file(s)`;
    }
    
    transfer_list.data = transfer_data;
}

async function wrapped_update() {
    try {
        general_list.patch("Connection", `Updating...`);
        await update();
    } catch(err) {
        console.log(err);
        general_list.patch("Connection", `Failed, ${err}`);
        return;
    }
};


function update_loop() {
    wrapped_update().then(() => {
        setTimeout(update_loop, 1000);
    });
}

update_loop();