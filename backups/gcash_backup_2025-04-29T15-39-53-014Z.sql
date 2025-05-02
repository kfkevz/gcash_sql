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
1	-1520.00
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: kfa
--

COPY public.transactions (id, date, "time", type, amount, name, ref, fee, remarks, created_at, updated_at) FROM stdin;
1	2025-04-29	11:38	Cash In	2000	KEV	12322	40	SENT	2025-04-29 15:38:52.792726	2025-04-29 15:38:52.792726
2	2025-04-29	11:38	Cash Out	500	KFA	12345	10	CLAIMED	2025-04-29 15:39:05.156333	2025-04-29 15:39:05.156333
3	2025-04-29	11:39	Load	20	AN20	44121	5	LOAD	2025-04-29 15:39:21.409391	2025-04-29 15:39:21.409391
\.


--
-- Name: currentbalance_id_seq; Type: SEQUENCE SET; Schema: public; Owner: kfa
--

SELECT pg_catalog.setval('public.currentbalance_id_seq', 1, true);


--
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: kfa
--

SELECT pg_catalog.setval('public.transactions_id_seq', 3, true);


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

