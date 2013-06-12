/**
 * Created with JetBrains WebStorm.
 * User: kono
 * Date: 2013/06/11
 * Time: 13:17
 * To change this template use File | Settings | File Templates.
 */

(function () {
    var popUp;

    function attributesToString(attr) {
        return '' +
            attr.map(function (o) {
                return '' + o.attr + ' : ' + o.val + '';
            }).join('') +
            '';
    }

    function showNodeInfo(event) {
        popUp && popUp.remove();

        var node;
        sigInst.iterNodes(function (n) {
            node = n;
        }, [event.content[0]]);

        popUp = $(
            ''
        ).append(
                attributesToString(node['attr']['attributes'])
            ).attr(
                'id',
                'node-info' + sigInst.getID()
            ).css({
                'display': 'inline-block',
                'border-radius': 3,
                'padding': 5,
                'background': '#fff',
                'color': '#000',
                'box-shadow': '0 0 4px #666',
                'position': 'absolute',
                'left': node.displayX,
                'top': node.displayY + 15
            });

        $('ul', popUp).css('margin', '0 0 0 20px');

        $('#overview').append(popUp);
    }

    function hideNodeInfo(event) {
        popUp && popUp.remove();
        popUp = false;
    }

    sigInst.bind('overnodes', showNodeInfo).bind('outnodes', hideNodeInfo).draw();
})();