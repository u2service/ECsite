from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
import phonenumbers
from phonenumbers import geocoder

def send_order_confirmation_email(order):
    """
    注文確定メールを送信する関数
    """
    subject = f"【My EC Store】ご注文ありがとうございます（注文番号: {order.id}）"

    # メールの本文（プレーンテキスト）を生成
    context = {
        'order': order,
        'items': order.items.all(), # OrderItemモデルがあることを前提
    }

    # templateを使って本文を作成（templates/emails/order_confirmation.txtを作成する場合）
    # message = render_to_string('emails/order_confirmation.txt', context)

    # 簡易的な文字列結合による本文作成例
    items_text = ""
    for item in order.items.all():
        items_text += f"- {item.product.name} x {item.quantity}: ¥{int(item.product.price * item.quantity):,}円\n"

    message = f"""
{order.user.username} 様

この度は My EC Store をご利用いただき、誠にありがとうございます。
以下の内容でご注文を承りました。

■注文番号: {order.id}
■注文日時: {order.created_at.strftime('%Y-%m-%d %H:%M:%S')}
■注文内容:
{items_text}
■合計金額: ¥{int(order.total_amount):,}円

商品の発送まで今しばらくお待ちください。
またのご利用を心よりお待ちしております。
    """

    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@example.com')
    recipient_list = [order.user.email]

    try:
        send_mail(subject, message, from_email, recipient_list)
        print(f"注文完了メールを送信しました: {order.id}")
    except Exception as e:
        print(f"メール送信エラー: {e}")

import phonenumbers
from phonenumbers import geocoder

def format_stripe_phone(e164_phone):
    """
    Stripeから届くE.164形式の電話番号を解析し、
    国内形式の番号と国名を返す。
    """
    if not e164_phone:
        return None, None
    try:
        # E.164形式（例: +819012345678）をパース
        parsed_number = phonenumbers.parse(e164_phone, None)

        # 国名の取得 (日本語で取得)
        country_name = geocoder.country_name_for_number(parsed_number, "ja")

        # 国内形式に整形 (例: 090-1234-5678 または 09012345678)
        # NATIONAL形式は、その国での一般的な表記（ハイフン等の有無は国による）を返します
        domestic_format = phonenumbers.format_number(
            parsed_number, phonenumbers.PhoneNumberFormat.NATIONAL
        )

        # 日本の場合、ハイフンを取り除いたり、より特定の形式にしたい場合はここで調整可能です
        # domestic_format = domestic_format.replace(" ", "").replace("-", "")

        return domestic_format, country_name
    except Exception as e:
        print(f"Phone parsing error: {e}")
        # パース失敗時は元の番号を返し、国名はNoneにする
        return e164_phone, None
