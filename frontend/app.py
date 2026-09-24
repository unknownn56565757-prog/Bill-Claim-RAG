import os
import requests
import streamlit as st
from dotenv import load_dotenv


# ============================================================
# CONFIGURATION
# ============================================================

load_dotenv()

API_URL = os.getenv(
    "API_URL",
    "http://localhost:8000"
)


# ============================================================
# PAGE CONFIGURATION
# ============================================================

st.set_page_config(
    page_title="Business Travel Claim Assistant",
    page_icon="✈️",
    layout="wide"
)


# ============================================================
# SESSION STATE
# ============================================================

if "token" not in st.session_state:
    st.session_state.token = None

if "user" not in st.session_state:
    st.session_state.user = None

if "session_id" not in st.session_state:
    st.session_state.session_id = None

if "messages" not in st.session_state:
    st.session_state.messages = []


# ============================================================
# API HELPERS
# ============================================================

def api_headers():
    return {
        "Authorization": f"Bearer {st.session_state.token}"
    }


def login(email, password):
    return requests.post(
        f"{API_URL}/auth/login",
        json={
            "email": email,
            "password": password
        },
        timeout=30
    )


def signup(name, email, password):
    return requests.post(
        f"{API_URL}/auth/signup",
        json={
            "name": name,
            "email": email,
            "password": password
        },
        timeout=30
    )


# ============================================================
# LOGIN / SIGNUP PAGE
# ============================================================

if not st.session_state.token:

    st.title("✈️ Business Travel Claim Assistant")

    st.caption(
        "Secure employee assistant for travel policy, "
        "expense claims and reimbursement."
    )

    tab1, tab2 = st.tabs(
        ["Login", "Sign up"]
    )

    # --------------------------------------------------------
    # LOGIN
    # --------------------------------------------------------

    with tab1:

        email = st.text_input(
            "Work email",
            key="login_email"
        )

        password = st.text_input(
            "Password",
            type="password",
            key="login_password"
        )

        if st.button(
            "Login",
            use_container_width=True
        ):

            try:

                r = login(
                    email,
                    password
                )

                if r.ok:

                    data = r.json()

                    st.session_state.token = data["access_token"]

                    st.session_state.user = data

                    st.rerun()

                else:

                    try:
                        detail = r.json().get(
                            "detail",
                            "Login failed."
                        )
                    except Exception:
                        detail = "Login failed."

                    st.error(detail)

            except Exception as e:

                st.error(
                    f"Backend connection failed: {e}"
                )


    # --------------------------------------------------------
    # SIGN UP
    # --------------------------------------------------------

    with tab2:

        name = st.text_input(
            "Full name"
        )

        email = st.text_input(
            "Work email",
            key="signup_email"
        )

        password = st.text_input(
            "Password",
            type="password",
            key="signup_password"
        )

        if st.button(
            "Create account",
            use_container_width=True
        ):

            try:

                r = signup(
                    name,
                    email,
                    password
                )

                if r.ok:

                    data = r.json()

                    st.session_state.token = data["access_token"]

                    st.session_state.user = {
                        "name": name,
                        "email": email
                    }

                    st.rerun()

                else:

                    try:
                        detail = r.json().get(
                            "detail",
                            "Sign up failed."
                        )
                    except Exception:
                        detail = "Sign up failed."

                    st.error(detail)

            except Exception as e:

                st.error(
                    f"Backend connection failed: {e}"
                )

    st.stop()


# ============================================================
# SIDEBAR
# ============================================================

with st.sidebar:

    st.subheader("Employee")

    st.write(
        st.session_state.user.get(
            "name",
            "User"
        )
    )

    st.caption(
        st.session_state.user.get(
            "email",
            ""
        )
    )

    # --------------------------------------------------------
    # NEW CONVERSATION
    # --------------------------------------------------------

    if st.button(
        "New conversation",
        use_container_width=True
    ):

        st.session_state.session_id = None

        st.session_state.messages = []

        st.rerun()


    # --------------------------------------------------------
    # LOGOUT
    # --------------------------------------------------------

    if st.button(
        "Logout",
        use_container_width=True
    ):

        st.session_state.clear()

        st.rerun()


# ============================================================
# MAIN CHAT PAGE
# ============================================================

st.title(
    "Business Travel Claim Assistant"
)

st.caption(
    "Ask about travel eligibility, expenses, receipts, "
    "claim submission and reimbursement."
)


# ============================================================
# DISPLAY PREVIOUS MESSAGES
# ============================================================

for msg in st.session_state.messages:

    with st.chat_message(
        msg["role"]
    ):

        st.markdown(
            msg["content"]
        )

        # IMPORTANT:
        #
        # We intentionally DO NOT display:
        #
        # - sources
        # - policy references
        # - pages
        # - chunks
        #
        # The RAG information remains internal.
        #
        # There is deliberately no st.expander("Policy references")
        # here.


# ============================================================
# CHAT INPUT
# ============================================================

question = st.chat_input(
    "Ask a business travel or reimbursement question..."
)


# ============================================================
# PROCESS QUESTION
# ============================================================

if question:

    # --------------------------------------------------------
    # STORE USER MESSAGE
    # --------------------------------------------------------

    st.session_state.messages.append(
        {
            "role": "user",
            "content": question
        }
    )


    # --------------------------------------------------------
    # DISPLAY USER MESSAGE
    # --------------------------------------------------------

    with st.chat_message("user"):

        st.markdown(
            question
        )


    # --------------------------------------------------------
    # ASSISTANT RESPONSE
    # --------------------------------------------------------

    with st.chat_message("assistant"):

        with st.spinner(
            "Checking the company policy..."
        ):

            try:

                r = requests.post(
                    f"{API_URL}/chat",
                    headers=api_headers(),
                    json={
                        "question": question,
                        "session_id": st.session_state.session_id
                    },
                    timeout=120
                )


                # ------------------------------------------------
                # SUCCESS
                # ------------------------------------------------

                if r.ok:

                    data = r.json()


                    # --------------------------------------------
                    # UPDATE SESSION
                    # --------------------------------------------

                    st.session_state.session_id = data[
                        "session_id"
                    ]


                    # --------------------------------------------
                    # GET ANSWER
                    # --------------------------------------------

                    answer = data.get(
                        "answer",
                        "I couldn't generate an answer."
                    )


                    # --------------------------------------------
                    # DISPLAY ANSWER
                    # --------------------------------------------

                    st.markdown(
                        answer
                    )


                    # --------------------------------------------
                    # STORE ANSWER
                    # --------------------------------------------
                    #
                    # IMPORTANT:
                    #
                    # We do NOT store or display sources here.
                    #

                    st.session_state.messages.append(
                        {
                            "role": "assistant",
                            "content": answer
                        }
                    )


                # ------------------------------------------------
                # BACKEND ERROR
                # ------------------------------------------------

                else:

                    try:

                        error = r.json().get(
                            "detail",
                            "Unable to answer."
                        )

                    except Exception:

                        error = (
                            "Unable to answer. "
                            "Please try again."
                        )

                    st.error(
                        error
                    )


            # ----------------------------------------------------
            # CONNECTION ERROR
            # ----------------------------------------------------

            except Exception as e:

                st.error(
                    f"Backend connection failed: {e}"
                )