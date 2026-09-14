-- Upgrade existing isolated rooms for v2/v3 actions.
create or replace function public.nlh_room(p_op text,p_code text default '',p_token uuid default null,p_data jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.nlh_rooms; m public.nlh_members; c text; seatno int; members jsonb; pending jsonb; is_host boolean; a jsonb;
begin
 if p_op='create' then
  c:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  insert into public.nlh_rooms(code) values(c) returning * into r;
  insert into public.nlh_members(room,seat,name,token) values(c,0,left(coalesce(nullif(trim(p_data->>'name'),''),'진행자'),12),r.host_token) returning * into m;
  return jsonb_build_object('code',c,'token',r.host_token,'seat',0,'host',true);
 end if;
 select * into r from public.nlh_rooms where code=upper(trim(p_code)) for update;
 if not found or r.created_at<now()-interval '7 days' then raise exception '방을 찾을 수 없거나 7일 보관 기간이 지났습니다.';end if;
 if p_op='join' then
  if r.state->>'phase'<>'lobby' then raise exception '이미 시작한 방입니다. 기존 참가자는 같은 브라우저에서 이어하기를 사용하세요.';end if;
  select count(*) into seatno from public.nlh_members where room=r.code;
  if seatno>=6 then raise exception '최대 6팀까지 참가할 수 있습니다.';end if;
  insert into public.nlh_members(room,seat,name) values(r.code,seatno,left(coalesce(nullif(trim(p_data->>'name'),''),'새 팀'),12)) returning * into m;
  update public.nlh_rooms set version=version+1,touched_at=now() where code=r.code;
  return jsonb_build_object('code',r.code,'token',m.token,'seat',seatno,'host',false);
 end if;
 if p_token is null then raise exception '참가 인증이 필요합니다.';end if;
 select * into m from public.nlh_members where room=r.code and token=p_token;
 if not found then raise exception '이 방의 참가 인증을 확인해주세요.';end if;
 is_host:=r.host_token=p_token;
 if p_op='send' then
  if r.state->>'phase' in ('lobby','done') then raise exception '현재 행동을 제출할 수 없습니다.';end if;
  if (select count(*) from public.nlh_actions where room=r.code and seat=m.seat)>4 then raise exception '앞선 행동이 처리될 때까지 기다려주세요.';end if;
  a:=p_data->'action';
  if jsonb_typeof(a)<>'object' or octet_length(a::text)>1024 or coalesce(a->>'type','') not in ('roll','choose','target','respond','next','vote','forecast','ack','rate','promise','keep','advise','share','guess') then raise exception '올바르지 않은 행동입니다.';end if;
  a:=jsonb_set(a,'{actor}',to_jsonb(m.seat));
  insert into public.nlh_actions(room,seat,action,nonce) values(r.code,m.seat,a,(p_data->>'nonce')::uuid) on conflict(nonce) do nothing;
  return jsonb_build_object('ok',true);
 elsif p_op='commit' then
  if not is_host then raise exception '진행자만 게임을 진행할 수 있습니다.';end if;
  if (p_data->>'version')::int is distinct from r.version then raise exception 'VERSION_CONFLICT';end if;
  if jsonb_typeof(p_data->'state') is distinct from 'object' or octet_length((p_data->'state')::text)>512000 then raise exception '게임 상태를 확인해주세요.';end if;
  update public.nlh_rooms set state=p_data->'state',version=version+1,touched_at=now() where code=r.code returning * into r;
  if p_data ? 'ack' then delete from public.nlh_actions where room=r.code and id=(p_data->>'ack')::bigint;end if;
 elsif p_op='read' and is_host then
  update public.nlh_rooms set touched_at=now() where code=r.code returning * into r;
 elsif p_op<>'read' then raise exception '지원하지 않는 요청입니다.';
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('seat',seat,'name',name) order by seat),'[]') into members from public.nlh_members where room=r.code;
 if is_host then
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'seat',seat,'action',action) order by id),'[]') into pending from (select * from public.nlh_actions where room=r.code order by id limit 12) q;
 else pending:='[]';end if;
 return jsonb_build_object('code',r.code,'state',r.state,'version',r.version,'members',members,'pending',pending,'updated',r.touched_at);
end $$;
revoke all on function public.nlh_room(text,text,uuid,jsonb) from public;
grant execute on function public.nlh_room(text,text,uuid,jsonb) to anon,authenticated;
