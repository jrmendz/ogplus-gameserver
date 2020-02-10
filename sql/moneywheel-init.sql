-- Table
insert into tableno(gamename,tablenumber,chinavideourl,seavideourl ,neavideourl,maxtime,gamecode,meta) values('MONEYWHEEL','M1','{}','{"\"ws://classic-video.pwqr820.com/live/Cgame12table1.flv\"","\"ws://classic-video.pwqr820.com/live/Cgame12table2.flv\"","\"ws://classic-video.pwqr820.com/live/Cgame12table3.flv\""}','{}','20','moneywheel','{"nextRoundDelay":6000,"videoUrl":"rtmp://video_southeast-asia.oriental-game.com:19356/grand/Ggame1table1"}');
insert into tableno(gamename,tablenumber,chinavideourl,seavideourl ,neavideourl,maxtime,gamecode,meta) values('MONEYWHEEL','M2','{}','{"\"ws://classic-video.pwqr820.com/live/Cgame12table1.flv\"","\"ws://classic-video.pwqr820.com/live/Cgame12table2.flv\"","\"ws://classic-video.pwqr820.com/live/Cgame12table3.flv\""}','{}','20','moneywheel','{"nextRoundDelay":6000,"videoUrl":"rtmp://video_southeast-asia.oriental-game.com:19356/grand/Ggame1table1"}');

-- Result List
insert into ResultList(Results) values('1');
insert into ResultList(Results) values('2');
insert into ResultList(Results) values('5');
insert into ResultList(Results) values('10');
insert into ResultList(Results) values('20');
insert into ResultList(Results) values('og');

-- Result List
insert into BetPlace(betplace) values('1');
insert into BetPlace(betplace) values('2');
insert into BetPlace(betplace) values('5');
insert into BetPlace(betplace) values('10');
insert into BetPlace(betplace) values('20');
insert into BetPlace(betplace) values('og');

-- result moneywheel
create table moneywheelvalues (
  id bigserial primary key,
  values text,
  idresult bigint references result(id)
);
