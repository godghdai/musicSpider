Ext.define('Ext.grid.column.Status', {
    extend: 'Ext.grid.column.Column',
    alias: ['widget.statuscolumn'],
    alternateClassName: 'Ext.grid.StatusColumn',
    defaultRenderer: function(v, meta, record, rowIdx, colIdx, store, view) {
        return '<span id="' + record.data["id"] + "_s" + '">' + record.data["status"]  + '</span>';
    }
});

