-- shoe hand
create table shoehand (
  id serial primary key,
  shoehandnumber varchar(8)
);

-- table number
create table tableno (
  id serial primary key,
  gamename varchar(16),
  tablenumber varchar(3)
);

create table productline (
  id serial primary key,
  line varchar(16)
);

create table platform (
  id serial primary key,
  platform varchar(10)
);
-- result list
create table resultlist (
  id serial primary key,
  results varchar(64)
);

-- results
create table result (
  id bigserial primary key,
  idtableno integer references tableno(id),
  idshoehand integer references shoehand(id),
  idresultlist integer references resultlist(id),
  shoedate date,
  createtime timestamp,
  addtime timestamp
);

-- result cards
create table baccacardvalues (
  id bigserial primary key,
  playercards varchar(12),
  bankercards varchar(12),
  idresult integer references result(id)
);

-- result cards
create table dtcardvalues (
  id bigserial primary key,
  dragoncards varchar(4),
  tigercards varchar(4),
  idresult integer references result(id)
);


-- betplace
create table betplace (
  id serial primary key,
  betplace varchar(16)
);

-- betplace
create table application (
  id serial primary key,
  applicationused varchar(16)
);

create table  device (
  id serial primary key,
  deviceused varchar(16)
);

--member
create table  member (
  id serial primary key,
  username varchar(15),
  emailaddress varchar(32),
  membersince timestamp,
  country varchar(20),
  currency char(4)
);

-- bet details
create table  betdetails (
  id serial primary key,
  idtableno integer references tableno(id),
  idmember integer,
  idbetplace integer references betplace(id),
  idresult integer references result(id),
  idproductline integer references productline(id),
  betamount decimal,
  effectivebetamount decimal,
  winloss decimal,
  betdate timestamp,
  createbettime timestamp,
  addbettime timestamp,
  shufflingmethod char(1),
  idshoehand integer references shoehand(id),
  iddevice integer references device(id),
  idplatform integer references platform(id),
  idapplication integer references application(id)
);

--dealer information
create table  dealerinfo (
  id serial primary key,
  dealername varchar(16)
);

--dealer bet information
create table  dealer_betinfo (
  id serial primary key,
  iddealerinfo integer references dealerinfo(id),
  idbetdetails integer references betdetails(id)
);

-- api
create table api (
  id serial primary key,
  type varchar(32)
);

create table  operator (
  id serial primary key,
  idapi integer references api(id),
  operatorname varchar(32),
  membersince timestamp
);

create table player_operator (
  id serial primary key,
  idmember integer references member(id),
  idoperator integer references operator(id)
);


create table  operator_activity (
  id serial primary key,
  idoperator integer references operator(id),
  turnover decimal,
  winloss decimal,
  totalmembers integer,
  activitydate timestamp
);

--cash flow
create table  cashflow (
  id bigserial primary key,
  idmember integer references member(id),
  balance decimal,
  deposit decimal,
  withdrawal decimal,
  voidcanceled_bets decimal,
  cancelwithdrawal decimal,
  createtime timestamp,
  addtime timestamp
);


create table  sessionlog (
  id serial primary key,
  idmember integer references member(id),
  link varchar(64),
  ipaddress varchar(16),
  sessiondate timestamp,
  createtimestart timestamp,
  createtimeend timestamp,
  addtimestart timestamp,
  addtimeend timestamp
);

-- transactions
create table  transaction (
  id serial primary key,
  betamount decimal,
  winloss decimal,
  transactiondate timestamp,
  idmember integer references member(id)
);






------------------------------
drop view v_betdetails;
create view v_betdetails as
select
  u.username,
  tl.id as table_id,
  tl.table_id as table_name,
  sh.shoehandnumber,
  rl.result,
  bd.bet_amount,
  bd.effective_bet_amount,
  bd.win_loss,
  bd.bet_date,
  bd.state,
  bd.balance,
  bd.bet_code,
  bp.bet_place,
  bd.is_supersix,
  bd.created_at
from t_betdetails bd
 left join c_tablelist tl on bd.table_id = tl.id
 left join t_user u on bd.user_id = u.id
 left join t_results r on bd.result_id = r.id
 left join c_betplace bp on bd.bet_code = bp.id
 left join c_resultlist rl on r.resultlist_id = rl.id
 left join c_shoehand sh on bd.shoehand_id = sh.id;
select * from v_betdetails;
----------------------


ALTER TABLE t_results CONVERT TO CHARACTER SET utf8;
