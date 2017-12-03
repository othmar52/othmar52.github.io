/**
 * notify is not implemented yet
 * currently notifications are only shown in the console
 * 
 * @method notify
 * @static
 * @chainable
 * 
 * @return {BlazingBaton} Returns the `BlazingBaton` object so methods can be chained.
 */
BlazingBaton.prototype.notify = function(message, errorId) {
    console.log(message);
    return this;
};
