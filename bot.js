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

const CHAR_CAP = 1800;
const TRUE_URL = "https://kanka.io/en-US/campaign/";
const GIVEN_URL = "https://kanka.io/campaign/";
const URL_FIX_OFFSET = TRUE_URL.length - GIVEN_URL.length + 1;
console.log(URL_FIX_OFFSET);

const clean = message => {
    const suf = message.length == CHAR_CAP + URL_FIX_OFFSET ? '...' : '';
    return message.replace(/\\n/g, '\n')
        .replace(/^\n*"\n*/, '')
        .replace(/\n*"\n*$/, '')
        .replace(/<br *\/>/g, '\n')
        // .replace(/^"\n(.*)\n"$/, "$1")
        .replace(/<p>(.*)<\/p>/g, "$1\n")
        .replace(/<em *>(.*)<\/em *>/g, "$1\n")
        .replace(/<\/*p *>/g, '')
        .replace(/<\/*em *>/g, '')
        .replace(/\n*$/, '') + suf;
}


client.on('message', evt =>  {
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
                    const reply = data => evt.reply(`${resp.data[0].url.replace(GIVEN_URL, TRUE_URL)}\n\n${clean(data)}`);
                    const id = resp.data[0].entity_id;
                    switch(resp.data[0].type) {
                        case 'character':
                            kanka(`characters/${resp.data[0].id}`)
                                .then(c => c.json())
                                .then(c => {
                                    console.log('C', c);
                                    if (c && c.data) {
                                        // evt.reply(turndown(c.data.entry).slice(0,CHAR_CAP));
                                        reply(JSON.stringify(c.data.entry.slice(0, CHAR_CAP)));
                                    } else throw 'Second Query Failed';
                                }).catch(e => onError(evt, term, e));
                            break;
                        case 'location':
                            kanka(`locations/${resp.data[0].id}`)
                                .then(c => c.json())
                                .then(c => {
                                    console.log('C', c);
                                    if (c && c.data) {
                                        reply(JSON.stringify(c.data.entry.slice(0, CHAR_CAP)));
                                        // evt.reply(turndown(c.data.entry).slice(0,CHAR_CAP));
                                    } else throw 'Second Query Failed';
                                }).catch(e => onError(evt, term, e));
                            break;

                        default: reply(JSON.stringify(resp.data[0]).slice(0, CHAR_CAP)); break;
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