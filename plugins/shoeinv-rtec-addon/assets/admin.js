(function($) {
    function toggleStockFields() {
        var enabled = $('#shoeinv-enabled-cb').is(':checked');
        $('.shoeinv-stock-fields').toggle(enabled);
    }
    $(document).ready(function() {
        toggleStockFields();
        $(document).on('change', '#shoeinv-enabled-cb', toggleStockFields);
    });
})(jQuery);
