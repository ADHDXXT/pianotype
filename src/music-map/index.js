import {initPlayerPool, playKey} from '../audio/player-pool';
import event from '../util/event';
import {EVENT, MODE, TOUCH_TYPE} from '../util/constant';
import cnchar from 'cnchar';
import poly from 'cnchar-poly';
import initStore from '../store';
import {freeKeyMap} from './keys';
import {configCnchar} from '../cnchar';
cnchar.use(poly);

configCnchar(cnchar);

let initedEvent = false;

let songData = null;

function playWithKey ({keyIndex, key, touchType, force = false, stopIndex = false}) {
    if (touchType === TOUCH_TYPE.END) {
        // stopPlayKey(keyIndex);
        // if (!force)
        //     event.emit(EVENT.TRIGGER_KEY_STATE, {
        //         key,
        //         touchType
        //     });
    } else {
        let store = initStore();
        let currentIndex = store.getters.currentIndex;
        if (key === songData.letterFlat[currentIndex] || store.getters.mode !== MODE.RIGHT) {
            event.emit(EVENT.TRIGGER_KEY_STATE, {
                key,
                isRight: true,
                touchType
            });
            if (!stopIndex) {
                currentIndex ++;
                if (currentIndex >= songData.indexLength) {
                    currentIndex = 0;
                }
                store.commit('setCurrentIndex', currentIndex);
            }
            playKey({keyIndex, key});
        } else {
            if (force) {
                playKey({keyIndex, key});
            } else {
                playKey({key});
                event.emit(EVENT.TRIGGER_KEY_STATE, {
                    key,
                    isRight: false,
                    touchType
                });
            }
        }
    }
}

export function initSong () {
    let store = initStore();
    let song = store.getters.currentSong;
    if (!song) {return console.warn('不存在的歌曲: ' + song.name);}
    songData = song.data;
    initLetter();
    event.emit(EVENT.LYRIC_CHANGE, {
        word: songData.word,
        letter: songData.letter
    });
    initPlayerPool(songData);

    if (!initedEvent) {
        initedEvent = true;
        event.regist(EVENT.TRIGGER_KEY, ({key, touchType}) => {
            let m = store.getters.mode;
            if (m === MODE.RIGHT) {
                playWithRightMode({key, touchType, store});
            } else if (m === MODE.ANY) {
                playWithAnyMode({key, touchType, store});
            } else if (m === MODE.FREE) {
                playWithFreeMode({key, touchType, store});
            }
        });
    }
}

function playWithRightMode ({key, touchType, store}) {

    let keyIndexes = getKeyIndexFromSongDate();
    if (keyIndexes.length === 1) {
        playWithKey({key, touchType, keyIndex: keyIndexes[0]});
    } else {
        if (key !== songData.letterFlat[store.getters.currentIndex]) {
            playWithKey({key, touchType, keyIndex: keyIndexes[0]});
        } else {
            keyIndexes.forEach((keyIndex, index) => {
                if (index === 0) {
                    playWithKey({key, touchType, keyIndex});
                } else {
                    setTimeout(() => {
                        playWithKey({key, touchType, keyIndex, force: true});
                    }, songData.delay * index);
                }
            });
        }
    }
}

function playWithAnyMode ({key, touchType}) {
    let keyIndexes = getKeyIndexFromSongDate();
    keyIndexes.forEach((keyIndex, index) => {
        if (index === 0) {
            playWithKey({key, touchType, keyIndex});
        } else {
            setTimeout(() => {
                playWithKey({key, touchType, keyIndex, stopIndex: true});
            }, songData.delay * index);
        }
    });
}


function playWithFreeMode ({key, touchType}) {
    playWithKey({
        key,
        touchType,
        keyIndex: freeKeyMap[key.toUpperCase()].keyIndex,
        stopIndex: true,
        force: true,
    });
}

function getKeyIndexFromSongDate () {
    return songData.key[initStore().getters.currentIndex].split('&');
}

function initLetter () {
    if (!songData.shaped) {
        songData.shaped = true;
        let letterStr = '';
        songData.letter = songData.word.map(word => {
            let str = cnchar.spell(word, 'first', 'up');
            letterStr += str;
            return str.split('');
        });
        songData.letterFlat = letterStr.split('');
        let length = 0;
        songData.word = songData.word.map(word => {
            length += word.length;
            return word.split('');
        });

        songData.indexLength = length;

        songData.key = songData.key.join(' ').split(' ');
        if (!songData.delay)
            songData.delay = 500;
    }
}