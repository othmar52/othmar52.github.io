
/**
 * display song position in numerical style like 1-4-3
 *
 * @method checkNumerator
 * @static
 * @chainable
 * 
 * @return {BlazingBaton} Returns the `BlazingBaton` object so methods can be chained.
 */
BlazingBaton.prototype.checkNumerator = function() {

    if(this.bar16Counter % 24 !== 0) {
        return this;
    }
    var counter = Math.floor(this.bar16Counter/24);
    document.querySelector(this.domSelectors.numerator.num1).innerHTML = Math.floor(counter/16) % 4 + 1;
    document.querySelector(this.domSelectors.numerator.num2).innerHTML = Math.floor(counter/4) % 4 + 1;
    document.querySelector(this.domSelectors.numerator.num3).innerHTML = counter % 4 + 1;
    return this;
};
