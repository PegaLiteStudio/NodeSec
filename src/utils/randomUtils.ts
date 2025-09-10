/**
 * Generate a random ID.
 * @param length - The length of the ID to generate.
 * @param onlyNumbers - If true, the ID will contain only numbers.
 * @returns The generated ID.
 */
export const generateRandomID = (length: number = 10, onlyNumbers: boolean = false): string => {
    const characters: string = onlyNumbers
        ? "0123456789"
        : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    return Array.from({length}, () =>
        characters.charAt(Math.floor(Math.random() * characters.length))
    ).join('');
};

/**
 * Generate a random string with only uppercase alphabets.
 * @param length - The length of the string to generate.
 * @returns The generated string.
 */
export const generateRandomString = (length: number = 10): string => {
    const characters: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    return Array.from({length}, () =>
        characters.charAt(Math.floor(Math.random() * characters.length))
    ).join('');
};

export const generateRandomPackage = (): string => {
    const randomPart = () => {
        const letters = "abcdefghijklmnopqrstuvwxyz";
        return Array.from({length: 6}, () => letters[Math.floor(Math.random() * letters.length)]).join("");
    };
    return `com.${randomPart()}.${randomPart()}`;
}
