// Run dotenv
require('dotenv').config();
const fetch = require('node-fetch');
const KANKA_API = process.env.KANKA_API;

const Discord = require('discord.js');
const client = new Discord.Client();

const Turndown = require('turndown');
const turndown = (new Turndown()).turndown;

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

const onError = (evt, term, err) => {
    console.error(err);
    evt.reply(`error searching for ${term}`);
};

const kanka = query => {console.log(`${KANKA_API}${query}`); return fetch(`${KANKA_API}${query}`, {
    headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${process.env.KANKA_TOKEN}`
    }
})}

client.on('message', function (evt) {
    const message = evt.content;
    console.log({
        // evt,
        message
    });

    const tag = message.match(/{{(.*)}}/);
    const [match, term] = tag ? tag : [null, null];
    if (term) {
        console.log({term});
        kanka(`search/${term}`)
            .then(resp => resp.json())
            .then(resp => {
                console.log('RESP', resp);
                if (resp && resp.data && resp.data[0]) {
                    const id = resp.data[0].entity_id;
                    switch(resp.data[0].type) {
                        case 'character':
                            kanka(`characters/${resp.data[0].id}`)
                                .then(c => c.json())
                                .then(c => {
                                    console.log('C', c);
                                    if (c && c.data) {
                                        // evt.reply(turndown(c.data.entry).slice(0,1800));
                                        evt.reply(JSON.stringify(c.data.entry.slice(0, 1800)));
                                    } else throw 'Second Query Failed';
                                }).catch(e => onError(evt, term, e));
                            break;
                        case 'location':
                            kanka(`locations/${resp.data[0].id}`)
                                .then(c => c.json())
                                .then(c => {
                                    console.log('C', c);
                                    if (c && c.data) {
                                        evt.reply(JSON.stringify(c.data.entry.slice(0, 1800)));
                                        // evt.reply(turndown(c.data.entry).slice(0,1800));
                                    } else throw 'Second Query Failed';
                                }).catch(e => onError(evt, term, e));
                            break;

                        default: evt.reply(JSON.stringify(resp.data[0]).slice(0, 1800)); break;
                    }
                } else throw 'NotFound'
            }).catch(e => {
                if (e === 'NotFound') {
                    evt.reply(`${term} Not Found`);
                } else onError(evt, term, e)
            });
    }

    // Our bot needs to know if it will execute a command
    // It will listen for messages that will start with `!`
    if (message && message.substring(0, 1) == '!') {
        var args = message.substring(1).split(' ');
        var cmd = args[0];
       
        args = args.splice(1);
        switch(cmd) {
            // !ping
            case 'ping':
                // bot.sendMessage({
                //     to: channelID,
                //     message: 'Pong!'
                // });
                evt.reply('pong');
            break;
            // Just add any case commands if you want to..
         }
     }
});

client.login(process.env.DISCORD_TOKEN);