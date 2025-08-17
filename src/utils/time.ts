const getPreferredTime = (): string => {
    return getTime(new Date());
};

const getTime = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    };

    const indianDateTimeFormatter = new Intl.DateTimeFormat('en-IN', options);
    return indianDateTimeFormatter.format(date);
};

export { getPreferredTime };
