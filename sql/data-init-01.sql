-- TableNo
insert into TableNo(GameName, Tablenumber) values('SQUEEZE BACCARAT', 'C1');
insert into TableNo(GameName, Tablenumber) values('SQUEEZE BACCARAT', 'C2');
insert into TableNo(GameName, Tablenumber) values('SPEED BACCARAT', 'C3');
insert into TableNo(GameName, Tablenumber) values('SPEED BACCARAT', 'C5');
insert into TableNo(GameName, Tablenumber) values('BACCARAT', 'C6');
insert into TableNo(GameName, Tablenumber) values('BACCARAT', 'C7');
insert into TableNo(GameName, Tablenumber) values('BACCARAT', 'C8');
insert into TableNo(GameName, Tablenumber) values('BACCARAT', 'C9');
insert into TableNo(GameName, Tablenumber) values('MULTICAM BACCARAT', 'G1');
insert into TableNo(GameName, Tablenumber) values('SPEED BACCARAT', 'G2');
insert into TableNo(GameName, Tablenumber) values('SPEED BACCARAT', 'G3');
insert into TableNo(GameName, Tablenumber) values('BACCARAT', 'G5');
insert into TableNo(GameName, Tablenumber) values('BACCARAT', 'G6');
insert into TableNo(GameName, Tablenumber) values('BACCARAT', 'G7');
insert into TableNo(GameName, Tablenumber) values('BACCARAT', 'G8');
insert into TableNo(GameName, Tablenumber) values('NEW DT', 'C10');
insert into TableNo(GameName, Tablenumber) values('CLASSIC DT', 'C11');
insert into TableNo(GameName, Tablenumber) values('NEW DT', 'G9');
insert into TableNo(GameName, Tablenumber) values('CLASSIC DT', 'G10');

-- Result List
insert into ResultList(Results) values('tie');
insert into ResultList(Results) values('banker');
insert into ResultList(Results) values('player');
insert into ResultList(Results) values('banker,banker_pair');
insert into ResultList(Results) values('banker,banker_pair,super_six');
insert into ResultList(Results) values('banker,banker_pair,player_pair');
insert into ResultList(Results) values('banker,banker_pair,player_pair,super_six');
insert into ResultList(Results) values('banker,player_pair');
insert into ResultList(Results) values('banker,player_pair,super_six');
insert into ResultList(Results) values('banker,super_six');
insert into ResultList(Results) values('player,banker_pair');
insert into ResultList(Results) values('player,banker_pair,player_pair');
insert into ResultList(Results) values('player,player_pair');
insert into ResultList(Results) values('tie,banker_pair');
insert into ResultList(Results) values('tie,banker_pair,player_pair');
insert into ResultList(Results) values('tie,player_pair');
insert into ResultList(Results) values('dragon');
insert into ResultList(Results) values('tiger');

-- Bet Places
insert into BetPlace(betplace) values('banker');
insert into BetPlace(betplace) values('player');
insert into BetPlace(betplace) values('tie');
insert into BetPlace(betplace) values('banker_pair');
insert into BetPlace(betplace) values('player_pair');
insert into BetPlace(betplace) values('super_six');
insert into BetPlace(betplace) values('dragon');
insert into BetPlace(betplace) values('tiger');
