■ KEIDORO++

・ルール
roomに全員で入る
room内で警察チーム、泥棒チームに分ける
両チームにナビゲーターを1人ずつおく
チーム内では音声通話が行える
ナビゲータは自チームの位置情報が表示される
自チームから半径rの中の敵チームも表示される

警察はタッチで泥棒を捕まえる
泥棒チームが警察チームのナビゲータの半径rに入ったら泥棒の勝ち

・実装イメージ
共有すべきデータは
　・メンバー情報(各自が全員分)
　・位置情報(ナビゲータが全員分)
　・音声(各自が自チーム内全員分)
メンバー情報はwebsocket
位置情報と音声はwebrtcで共有

key=uuid : value=1or2

class room{
  stinrg name;
  int othersc;
  map othersv = {uuid:status};
}
string nav_uuid


人が入る
socket.emit('enter', roomname);
socket.idを全員に

あるroomに全員入る
人が入るたびに入った人のidを受け取ってotherc++,otherv[uuid] = 0;
そのuuidに向けて自分のuuidを送る
[準備OK]を押すと自分のuuidとその旨が送られてisReady++;
他のユーザーから準備OKの旨を受け取ってもisReady++;
isReady==otherc+1になったら、
2チームにわける[警察になる][泥棒になる]
自分のuuidと警察か泥棒か(status=1or2)を送る
受け取ったらotherv[uuid] = statusとしisReady++;(0にしとく)
同様に全員そろったらナビゲータになるか聞く
一番早かった人をナビゲータに
各チーム内の音声通話をつなぐ
ナビゲータに全員分の位置情報をおくる










実装イメージ

//入室イベント
client:
あるroom（URLの末尾に?roomname）に入る
roomに入ると自分のidを部屋内の全員に送信する
roomにいる人が自分のidを返すのでmemberを生成しmembersにセット
メンバーの人数をmemberCountに格納
server:
navi[roomname] = 0;


//全員の準備ができたらメンバー確定、スタート
[準備OK]を押すと部屋内の全員に入室メッセージ送信する
入室メッセージを受け取るとreadyCountをインクリメント
memberCount==readyCountとなったらスタート

//チーム分け
2チームにわける[警察になる][泥棒になる]
自分のidと警察か泥棒か(team=1or2)を送る
teamを受け取ったら
自分のteamは保持しておく、
自分のチームの



























