--
-- PostgreSQL database dump
--

-- Dumped from database version 16.8 (Debian 16.8-1.pgdg120+1)
-- Dumped by pg_dump version 16.8 (Debian 16.8-1.pgdg120+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: transaction_type; Type: TYPE; Schema: public; Owner: kfa
--

CREATE TYPE public.transaction_type AS ENUM (
    'Cash In',
    'Cash Out',
    'Load'
);


ALTER TYPE public.transaction_type OWNER TO kfa;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: currentbalance; Type: TABLE; Schema: public; Owner: kfa
--

CREATE TABLE public.currentbalance (
    id integer NOT NULL,
    balance numeric DEFAULT 0.00 NOT NULL
);


ALTER TABLE public.currentbalance OWNER TO kfa;

--
-- Name: currentbalance_id_seq; Type: SEQUENCE; Schema: public; Owner: kfa
--

CREATE SEQUENCE public.currentbalance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.currentbalance_id_seq OWNER TO kfa;

--
-- Name: currentbalance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kfa
--

ALTER SEQUENCE public.currentbalance_id_seq OWNED BY public.currentbalance.id;


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: kfa
--

CREATE TABLE public.transactions (
    id integer NOT NULL,
    date text NOT NULL,
    "time" text NOT NULL,
    type public.transaction_type NOT NULL,
    amount text NOT NULL,
    name text NOT NULL,
    ref text NOT NULL,
    fee text NOT NULL,
    remarks text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.transactions OWNER TO kfa;

--
-- Name: transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: kfa
--

CREATE SEQUENCE public.transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transactions_id_seq OWNER TO kfa;

--
-- Name: transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kfa
--

ALTER SEQUENCE public.transactions_id_seq OWNED BY public.transactions.id;


--
-- Name: currentbalance id; Type: DEFAULT; Schema: public; Owner: kfa
--

ALTER TABLE ONLY public.currentbalance ALTER COLUMN id SET DEFAULT nextval('public.currentbalance_id_seq'::regclass);


--
-- Name: transactions id; Type: DEFAULT; Schema: public; Owner: kfa
--

ALTER TABLE ONLY public.transactions ALTER COLUMN id SET DEFAULT nextval('public.transactions_id_seq'::regclass);


--
-- Data for Name: currentbalance; Type: TABLE DATA; Schema: public; Owner: kfa
--

COPY public.currentbalance (id, balance) FROM stdin;
1	8755.76
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: kfa
--

COPY public.transactions (id, date, "time", type, amount, name, ref, fee, remarks, created_at, updated_at) FROM stdin;
1	2025-05-01	06:51	Cash Out	500	MA N D.	96629	10	CLAIMED	2025-05-01 13:04:21.664696	2025-05-01 13:04:21.664696
2	2025-05-01	08:18	Cash In	1000	M CR A L.	703484	15	CUANA	2025-05-01 13:05:12.10571	2025-05-01 13:05:12.10571
3	2025-05-01	08:28	Cash In	60	JOYCE F.	47823	5	SENT	2025-05-01 13:05:32.110816	2025-05-01 13:05:32.110816
4	2025-05-01	09:31	Cash Out	3000	JASON A.	18826	60	CLAIMED	2025-05-01 13:05:49.012379	2025-05-01 13:05:49.012379
5	2025-05-01	10:26	Cash In	500	LA I G.	56570	10	CUANA	2025-05-01 13:06:07.311604	2025-05-01 13:06:07.311604
6	2025-05-01	10:30	Cash In	2000	MARK VINCENT G.	82091	30	CUANA	2025-05-01 13:06:46.108889	2025-05-01 13:06:46.108889
7	2025-05-01	10:38	Cash Out	200	JOYCE F.	45961	10	CLAIMED	2025-05-01 13:07:04.223489	2025-05-01 13:07:04.223489
8	2025-05-01	11:11	Cash In	500	RA Z S.	69025	10	CUANA	2025-05-01 13:07:20.713916	2025-05-01 13:07:20.713916
9	2025-05-01	11:19	Cash In	850	VI R M.	21736	20	SENT	2025-05-01 13:08:03.606645	2025-05-01 13:08:03.606645
10	2025-05-01	11:12	Cash In	500	RENATO F.	38845	10	SENT	2025-05-01 13:08:22.356737	2025-05-01 13:08:22.356737
11	2025-05-01	11:42	Cash In	100	MA N T.	40447	10	CUANA	2025-05-01 13:08:45.070284	2025-05-01 13:08:45.070284
12	2025-05-01	12:06	Cash In	200	RO O R.	17024	10	SENT	2025-05-01 13:09:11.124091	2025-05-01 13:09:11.124091
13	2025-05-01	12:21	Cash In	1300	ER Y A S.	80598	20	CUANA	2025-05-01 13:09:29.573553	2025-05-01 13:09:29.573553
14	2025-05-01	12:23	Cash In	500	RENATO F.	17459	10	SENT	2025-05-01 13:09:46.476964	2025-05-01 13:09:46.476964
15	2025-05-01	12:47	Cash Out	200	CH N L.	61051	10	CLAIMED	2025-05-01 13:10:06.523386	2025-05-01 13:10:06.523386
16	2025-05-01	12:48	Cash In	500	RENATO F.	707682	10	SENT	2025-05-01 13:10:25.438292	2025-05-01 13:10:25.438292
17	2025-05-01	12:56	Cash In	650	AM A A.	32695	15	CUANA	2025-05-01 13:10:42.502778	2025-05-01 13:10:42.502778
18	2025-05-01	13:03	Cash In	300	RA Z S.	61771	10	CUANA	2025-05-01 13:11:00.33126	2025-05-01 13:11:00.33126
19	2025-05-01	13:10	Cash In	100	ROMMEL F.	99680	10	SENT	2025-05-01 13:13:03.347106	2025-05-01 13:13:03.347106
20	2025-05-01	13:25	Cash In	500	MA S S.	60425	10	CUANA	2025-05-01 13:13:26.267324	2025-05-01 13:13:26.267324
21	2025-05-01	13:31	Cash Out	90	RE E DA A Q.	54512	5	CLAIMED	2025-05-01 13:14:07.188497	2025-05-01 13:14:07.188497
23	2025-05-01	14:34	Cash In	500	EMILY F.	35318	10	SENT	2025-05-01 13:14:40.069342	2025-05-01 13:14:40.069342
24	2025-05-01	14:53	Cash In	300	JU Y R.	69866	10	SENT	2025-05-01 13:14:55.184007	2025-05-01 13:14:55.184007
25	2025-05-01	15:04	Cash In	200	RICHELLE B.	96769	10	SENT	2025-05-01 13:16:09.021677	2025-05-01 13:16:09.021677
22	2025-05-01	14:15	Cash In	200	RO D BR N A.	80873	10	CUANA	2025-05-01 13:14:25.430457	2025-05-01 13:17:43.038519
27	2025-05-01	15:18	Cash In	150	AR N C.	91743	10	CUANA	2025-05-01 13:18:17.935064	2025-05-01 13:18:17.935064
28	2025-05-01	18:39	Cash Out	3000	SEABANK	30215	60	CLAIMED	2025-05-01 13:19:19.809979	2025-05-01 13:19:19.809979
29	2025-05-01	19:36	Cash Out	510	HA L B.	87476	10	CLAIMED	2025-05-01 13:19:46.473861	2025-05-01 13:19:46.473861
30	2025-05-01	19:38	Cash In	51	EZ50	97644	4	CUANA LOAD	2025-05-01 13:20:28.851376	2025-05-01 13:20:28.851376
31	2025-05-01	18:46	Cash Out	800	ROMMEL F.	60402	20	CLAIMED	2025-05-01 13:21:12.210665	2025-05-01 13:21:12.210665
32	2025-05-01	20:13	Cash Out	210	RO L C.	900734	10	CUANA	2025-05-01 13:23:01.210343	2025-05-01 13:23:01.210343
33	2025-05-01	21:21	Cash Out	500	RO O J P.	49982	10	CUANA	2025-05-01 13:23:23.155962	2025-05-01 13:23:23.155962
34	2025-05-01	18:08	Cash In	1600	BR A T.	16483	30	CUANA	2025-05-01 13:24:11.176789	2025-05-01 13:24:11.176789
35	2025-05-01	18:38	Cash In	500	JO N S.	85397	10	CUANA	2025-05-01 13:24:26.73924	2025-05-01 13:24:26.73924
36	2025-05-01	18:44	Cash In	200	MA N T.	13956	10	CUANA	2025-05-01 13:24:54.66789	2025-05-01 13:24:54.66789
37	2025-05-01	19:52	Cash In	3500	MARY GRACE B.	60527	50	CUANA	2025-05-01 13:25:19.29115	2025-05-01 13:25:19.29115
38	2025-05-01	19:54	Cash In	500	MA S S.	59154	10	CUANA	2025-05-01 13:25:35.488164	2025-05-01 13:25:35.488164
39	2025-05-01	12:28	Cash In	55	KUYA JUN	D96DB	5	MAYA - SENT	2025-05-01 13:26:32.599801	2025-05-01 13:26:42.975906
40	2025-05-01	13:24	Cash In	65	KUYA JUN	61856	5	MAYA - SENT	2025-05-01 14:03:42.564449	2025-05-01 14:03:42.564449
41	2025-05-01	14:01	Cash Out	2000	JANICE O.	61EBE	40	MAYA - CLAIMED	2025-05-01 14:04:24.850165	2025-05-01 14:04:24.850165
42	2025-05-01	14:33	Cash Out	1000	JOHN AARON	78D42	20	MAYA - CLAIMED	2025-05-01 14:04:42.358934	2025-05-01 14:04:42.358934
43	2025-05-01	14:48	Cash In	50	MARISSA	C5D3D	5	MAYA - SENT	2025-05-01 14:04:58.237573	2025-05-01 14:04:58.237573
\.


--
-- Name: currentbalance_id_seq; Type: SEQUENCE SET; Schema: public; Owner: kfa
--

SELECT pg_catalog.setval('public.currentbalance_id_seq', 1, true);


--
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: kfa
--

SELECT pg_catalog.setval('public.transactions_id_seq', 43, true);


--
-- Name: currentbalance currentbalance_pkey; Type: CONSTRAINT; Schema: public; Owner: kfa
--

ALTER TABLE ONLY public.currentbalance
    ADD CONSTRAINT currentbalance_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: kfa
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- PostgreSQL database dump complete
--

