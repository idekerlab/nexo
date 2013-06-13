/**
 * Created with JetBrains WebStorm.
 * User: kono
 * Date: 2013/06/12
 * Time: 13:25
 * To change this template use File | Settings | File Templates.
 */

/* global Backbone */
/* global sigma */
/* global d3 */
/* global $ */



var Networks = Backbone.Collection.extend({

    model: Network,

    comparator: function (node) {
        return node.get("name");
    }

});

var NetworkManagerView = Backbone.View.extend({
    model: Networks

});