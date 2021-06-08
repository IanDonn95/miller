// Run dotenv
require('dotenv').config();
const fetch = require('node-fetch');
const KANKA_API = process.env.KANKA_API;

const Discord = require('discord.js');
const client = new Discord.Client();

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

const clean = message => {
    const suf = message.length == CHAR_CAP + URL_FIX_OFFSET ? '...' : '';
    return message.replace(/\\n/g, '\n')
        .replace(/^\n*"\n*/, '')
        .replace(/\n*"\n*$/, '')
        .replace(/<br *\/>/g, '\n')
        .replace(/<p>(.*)<\/p>/g, "$1\n")
        .replace(/<em *>(.*)<\/em *>/g, "$1\n")
        .replace(/<\/*p *>/g, '')
        .replace(/<\/*em *>/g, '')
        .replace(/\n*$/, '') + suf;
}

const churnTracker = (evt, message) => {
    console.log('in churn');
    const changes = message.match(/[+-]? *\d+/g);
    console.log(changes);
    const newChurn = message.match(/^[Cc]hurn: (-?\d+)$/) && message.match(/^[Cc]hurn: (-?\d+)$/)[1];
    if (changes && changes.length > 0 && !message.match(/[a-zA-Z]/)) {
        const churn = changes.map(change => Number(change.replace(/ /g, ''))).reduce((acc, c) => acc + c, 0);
        evt.channel.fetchMessages()
            .then(messages => {
                const m = messages.sort((a, b) => b.createdTimestamp - a.createdTimestamp);
                const messageMatch = m.find(m => m.content.match(/^Churn: (-?\d+)$/));
                const current = messageMatch && messageMatch.content.match(/^[Cc]hurn: (-?\d+)$/)[1];
                if (current && !Number.isNaN(churn + Number(current))) {
                    evt.channel.send(`Churn: ${churn + Number(current)}`);
                } else {
                    evt.reply(`Could not interpret current churn or new changes:\nNewChurn?: ${churn}\nCurrent?: ${current}`)
                }
            }).catch(error => (console.error(error), evt.reply(`Error fetching messages to find current churn\nNew Churn: ${churn}`)));
    } else if (newChurn) {
        evt.reply(`Setting Churn to ${newChurn}`);
    } else {
        evt.reply('Could not interpret changes to churn, use format +1, -2, etc.');
    }
}

client.on('message', evt =>  {
    if (evt.author.username === 'Miller') return;
    const message = evt.content;
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
    } else if (['bot-testing', 'churn-tracker', 'test-table'].includes(evt.channel.name)) {
        churnTracker(evt, message);
    }
});

client.login(process.env.DISCORD_TOKEN);