var CookieService = {
    getCookie: function (cname) {
        var name = cname + "=";
        var decodedCookie = decodeURIComponent(document.cookie);
        var ca = decodedCookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) == 0) {
                return c.substring(name.length, c.length);
            }
        }
        return "";
    },
    setCookie: function (name, value, expirationDays) {
        var exdate = new Date();
        exdate.setDate(exdate.getDate() + (expirationDays || 365));
        var cookie = [
            name + '=' + value,
            'expires=' + exdate.toUTCString(),
            'path=/'
        ];
        document.cookie = cookie.join(';');
    }
}

export default CookieService