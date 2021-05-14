String.prototype.replaceAll = function (search, replacement) {
    return this.split(search).join(replacement);
};

String.prototype.getBetweenStrs = function (str1, str2) {
    if (this.split(str1)[1] && this.split(str1)[1].split(str2)[0]) {
        return this.split(str1)[1].split(str2)[0];
    }
    return '';
};
