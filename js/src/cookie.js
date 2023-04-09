/**
 * set cookie
 * 
 * @method setCookie
 * @author: eugene-ilyin https://gist.github.com/eugene-ilyin/127abe8d9b56f6bd370d
 * @static
 * @chainable
 * 
 *
 * @return {BlazingBaton} Returns the `BlazingBaton` object so methods can be chained.
 */
BlazingBaton.prototype.setCookie = function(name, value, expires, path, domain, secure) {
    document.cookie = name + "=" + escape(value) +
        ((expires) ? "; expires=" + expires : "") +
        ((path) ? "; path=" + path : "") +
        ((domain) ? "; domain=" + domain : "") +
        ((secure) ? "; secure" : "");
    return this;
}

/**
 * get cookie
 * 
 * @method getCookie
 * @author: eugene-ilyin https://gist.github.com/eugene-ilyin/127abe8d9b56f6bd370d
 * @static
 *
 * @return {String|null} Returns the value of the cookie
 */
BlazingBaton.prototype.getCookie = function(name) {
    var cookie = " " + document.cookie;
    var search = " " + name + "=";
    var setStr = null;
    var offset = 0;
    var end = 0;
    if (cookie.length < 1) {
        return setStr;
    }
    offset = cookie.indexOf(search);
    if (offset === -1) {
        return setStr;
    }
    offset += search.length;
    end = cookie.indexOf(";", offset)
    if (end === -1) {
        end = cookie.length;
    }
    setStr = unescape(cookie.substring(offset, end));
    return setStr;
}

/**
 * delete cookie
 * 
 * @method deleteCookie
 * @author: eugene-ilyin https://gist.github.com/eugene-ilyin/127abe8d9b56f6bd370d
 * @static
 * @chainable
 * 
 *
 * @return {BlazingBaton} Returns the `BlazingBaton` object so methods can be chained.
 */
BlazingBaton.prototype.deleteCookie = function(name) {
  document.cookie = name + "=" + "; expires=Thu, 01 Jan 1970 00:00:01 GMT";
  return this;
}
