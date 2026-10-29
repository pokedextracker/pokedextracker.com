// A dash after every 4 digits but the last.
const FRIEND_CODE_GROUPS_REGEX = /(\d{4})(?=\d)/g;

export function capitalize(input: string): string {
  return input.replace(
    /([^\W_]+[^\s-]*) */g,
    (word) => word[0].toUpperCase() + word.substr(1).toLowerCase(),
  );
}

export function decimal(number: number, precision: number): string {
  return number.toFixed(precision);
}

// A friend code keeps only its 12 digits, as they're typed, in groups of 4.
export function friendCode3dsFormatter(code: string): string {
  return code
    .replace(/\D/g, "")
    .slice(0, 12)
    .replace(FRIEND_CODE_GROUPS_REGEX, "$1-");
}

// A Switch one has SW- in front. Typing SW- itself is left alone, and anything
// else gets SW- put in front of it.
export function friendCodeSwitchFormatter(code: string): string {
  const upperCode = code.toUpperCase();
  if ("SW-".startsWith(upperCode)) {
    return upperCode;
  }

  const digits = upperCode.replace(/^S?W?-?/, "").replace(/\D/g, "");
  return `SW-${digits.slice(0, 12).replace(FRIEND_CODE_GROUPS_REGEX, "$1-")}`;
}

export function padding(
  number: number | "---",
  digits: number,
  value = "0",
): string {
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
export function nationalId(id: number): number {
  return id;
}

// Sometimes, when it's not clear what the national IDs are for Pokemon, Serebii
// picks IDs that we don't go along with. So this function is a centralized
// location where we can transform it if we need to. Most of the time, this
// function will just return the ID again because our database national IDs will
// be correct.
export function serebiiNationalId(id: number): number {
  id = nationalId(id);
  return id;
}

export function serebiiLink(serebiiPath: string, nationalId: number) {
  return `http://www.serebii.net/${serebiiPath}/${padding(serebiiNationalId(nationalId), 3)}.shtml`;
}
