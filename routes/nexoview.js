/**
 * Created with JetBrains WebStorm.
 * User: kono
 * Date: 2013/05/08
 * Time: 15:36
 * To change this template use File | Settings | File Templates.
 */

var request = require("request");

exports.showSummary = function (req, res) {

    res.render('nexoview', { brand: 'NeXO', title: 'NeXO Term ID ' + req.params.id });

};