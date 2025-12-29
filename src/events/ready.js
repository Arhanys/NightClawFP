export default {
    name: "clientReady",
    once: true,

    execute(client) {
        console.log(`Successfully logged in as ${client.user.tag}`);
    }
};
