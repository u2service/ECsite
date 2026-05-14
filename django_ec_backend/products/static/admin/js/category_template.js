document.addEventListener('DOMContentLoaded', async function() {
    const categorySelect = document.getElementById('id_category');
    const specField = document.getElementById('id_specifications');

    // 2. カテゴリが変更されたら反映
    if (categorySelect) {
        categorySelect.addEventListener('change', function() {
            const categoryId = this.value;
            console.log("Category changed to:", categoryId); // 動作確認用

            if (!categoryId) return;

            // APIからスペック定義を取得する
            fetch(`/api/category-specs/${categoryId}/`)
                .then(res => {
                    if (!res.ok) throw new Error('Network response was not ok');
                    return res.json();
                })
                .then(data => {
                    const currentSpecs = {};
                    data.forEach(item => {
                        currentSpecs[item.name] = ""; // 空のテンプレート作成
                    });
                    // JSONFieldのテキストエリアに流し込む
                    specField.value = JSON.stringify(currentSpecs, null, 4);
                });
        });
    }
});
