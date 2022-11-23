const FRIEND_CODE_3DS_REGEX = /(\d{4})(?=\d)/g;
const FRIEND_CODE_SWITCH_REGEX = /(^[a-zA-Z]{2}|\d{4})(?=\d)/g;

export function capitalize (input) {
  return input.replace(/([^\W_]+[^\s-]*) */g, (word) => word[0].toUpperCase() + word.substr(1).toLowerCase());
}

export function decimal (number, precision) {
  return number.toFixed(precision);
}

export function friendCode3dsFormatter (code) {
  return code && code.replace(FRIEND_CODE_3DS_REGEX, '$1-');
}

export function friendCodeSwitchFormatter (code) {
  if (!code) {
    return code;
  }

  code = code.toUpperCase();

  // Allow the user to type in `SW-`, but if they start typing something else
  // in, force `SW-` in front of whatever it was that they were typing. This
  // will make it so that if they follow the formatting rules, nothing will
  // self-correct, but if they don't, it will.
  ['S', 'W', '-'].forEach((letter, i) => {
    if (code[i] && code[i] !== letter) {
      code = code.slice(0, i) + letter + code.slice(i);
    }
  });

  return code.replace(FRIEND_CODE_SWITCH_REGEX, '$1-');
}

export function padding (number, digits, value = '0') {
  if (parseInt(`${number}`, 10) >= 10 ** digits) {
    return `${number}`;
  }
  return `${value.repeat(digits)}${number}`.slice(-1 * digits);
}

// This is just to account for the national ID hack of Scarlet/Violet before
// HOME support is released.
export function nationalId (id) {
  if (id >= 1906) {
    // We shave off 1000 since that's what we added to all new Pokemon.
    id -= 1000;
  }
  return id;
}

// Hopefully, we don't have to maintain this long-term once we get official
// national IDs with HOME. Right now, Serebii skips IDs 980 and 987.
export function serebiiNationalId (id) {
  id = nationalId(id);
  if (id >= 980) {
    // We add 1 since Serebii skips 980.
    id += 1;
  }
  if (id >= 987) {
    // We add another 1 since Serebii skips 987.
    id += 1;
  }
  return id;
}

export function serebiiLink (serebiiPath, nationalId) {
  return `http://www.serebii.net/${serebiiPath}/${padding(serebiiNationalId(nationalId), 3)}.shtml`;
}
