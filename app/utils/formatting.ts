const FRIEND_CODE_3DS_REGEX = /(\d{4})(?=\d)/g;
const FRIEND_CODE_SWITCH_REGEX = /(^[a-zA-Z]{2}|\d{4})(?=\d)/g;

export function capitalize (input: string): string {
  return input.replace(/([^\W_]+[^\s-]*) */g, (word) => word[0].toUpperCase() + word.substr(1).toLowerCase());
}

export function decimal (number: number, precision: number): string {
  return number.toFixed(precision);
}

export function friendCode3dsFormatter (code: string | undefined): string | undefined {
  return code?.replace(FRIEND_CODE_3DS_REGEX, '$1-');
}

export function friendCodeSwitchFormatter (code: string | undefined): string | undefined {
  if (!code) {
    return code;
  }

  let upperCode = code.toUpperCase();

  // Allow the user to type in `SW-`, but if they start typing something else
  // in, force `SW-` in front of whatever it was that they were typing. This
  // will make it so that if they follow the formatting rules, nothing will
  // self-correct, but if they don't, it will.
  ['S', 'W', '-'].forEach((letter, i) => {
    if (upperCode[i] && upperCode[i] !== letter) {
      upperCode = upperCode.slice(0, i) + letter + upperCode.slice(i);
    }
  });

  return upperCode.replace(FRIEND_CODE_SWITCH_REGEX, '$1-');
}

export function padding (number: number, digits: number, value = '0'): string {
  if (parseInt(`${number}`, 10) >= 10 ** digits) {
    return `${number}`;
  }
  return `${value.repeat(digits)}${number}`.slice(-1 * digits);
}

// This is a centralized place where we have the ability to transform the
// national ID from what is stored in the database to what we want to show the
// to user. This isn't used all the time, but sometimes, when a new game comes
// out, we don't know the national IDs for sure, so we offset them to make the
// update when we do know the real national IDs easier. Most of the time, this
// function will just return the ID again because our database national IDs will
// be correct.
export function nationalId (id: number): number {
  return id;
}

// Sometimes, when it's not clear what the national IDs are for Pokemon, Serebii
// picks IDs that we don't go along with. So this function is a centralized
// location where we can transform it if we need to. Most of the time, this
// function will just return the ID again because our database national IDs will
// be correct.
export function serebiiNationalId (id: number): number {
  id = nationalId(id);
  return id;
}

export function serebiiLink (serebiiPath: string, nationalId: number) {
  return `http://www.serebii.net/${serebiiPath}/${padding(serebiiNationalId(nationalId), 3)}.shtml`;
}
