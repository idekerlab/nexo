/**
 * Created with JetBrains WebStorm.
 * User: kono
 * Date: 2013/05/08
 * Time: 15:36
 * To change this template use File | Settings | File Templates.
 */

exports.showSummary = function (req, res) {
    res.render('nexoview', { brand: 'NeXO', title: 'NeXO Term ID: ' + req.params.id, term: req.params.id });
};