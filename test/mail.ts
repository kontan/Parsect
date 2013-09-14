/// <reference path="../src/parsect.ts" />

module mail {
    import p = Parsect;
    import j = Parsect.Join;

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // RFC 5234 Augmented BNF for Syntax Specifications: ABNF ///////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // ALPHA          =  %x41-5A / %x61-7A   ; A-Z / a-z
    var ALPHA: p.Parser<string> = p.or(p.range(0x41, 0x5a), p.range(0x61, 0x7a));

    // BIT            =  "0" / "1"
    var BIT: p.Parser<string> = p.or(p.string("0"), p.string("1"));

    // CHAR           =  %x01-7F
    //                            ; any 7-bit US-ASCII character,
    //                            ;  excluding NUL
    var CHAR: p.Parser<string> = p.range(0x01, 0x7f);

    // CR             =  %x0D
    //                            ; carriage return
    var CR: p.Parser<string> = p.charCode(0x0d);

    // CRLF           =  CR LF
    //                            ; Internet standard newline
    var CRLF: p.Parser<string> = p.seq(s=>{ var m = s(CR); var n = s(LF); return m + n; });

    // CTL            =  %x00-1F / %x7F
    //                             ; controls
    var CTL: p.Parser<string> = p.or(p.range(0x00, 0x1f), p.charCode(0x7f));

    // DIGIT          =  %x30-39
    //                            ; 0-9
    var DIGIT: p.Parser<string> = p.range(0x30, 0x39);

    //DQUOTE         =  %x22
    //                            ; " (Double Quote)
    var DQUOTE: p.Parser<string> = p.charCode(0x22);

    // HEXDIG         =  DIGIT / "A" / "B" / "C" / "D" / "E" / "F"
    var HEXDIG: p.Parser<string> = p.or(DIGIT, p.string("A"), p.string("B"), p.string("C"), p.string("D"), p.string("E"), p.string("F"));

    // HTAB           =  %x09
    //                         ; horizontal tab
    var HTAB: p.Parser<string> = p.charCode(0x09);

    // LF             =  %x0A
    //                            ; linefeed
    var LF: p.Parser<string> = p.charCode(0x0a);

    // LWSP           =  *(WSP / CRLF WSP)
    //                             ; Use of this linear-white-space rule
    //                             ;  permits lines containing only white
    //                             ;  space that are no longer legal in
    //                             ;  mail headers and have caused
    //                             ;  interoperability problems in other
    //                             ;  contexts.
    //                             ; Do not use when defining mail
    //                             ;  headers and use with caution in
    //                             ;  other contexts.

    // OCTET          =  %x00-FF
    //                             ; 8 bits of data
    var OCTET: p.Parser<string> = p.range(0x00, 0xff);

    // SP             =  %x20
    var SP: p.Parser<string> = p.charCode(0x20);

    // VCHAR          =  %x21-7E
    //                             ; visible (printing) characters
    var VCHAR: p.Parser<string> = p.range(0x21, 0x7e);

    // WSP            =  SP / HTAB
    //                             ; white space
    var WSP: p.Parser<string> = p.or(SP, HTAB);

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // RFC 5322 Internet Message Format
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // 3.2.1.  Quoted characters /////////////////////////////////////////////////////////////////////////
    // quoted-pair     =   ("\" (VCHAR / WSP)) / obs-qp
    var quoted_pair: p.Parser<string> = p.or(
        p.tail(p.string("\\"), p.or(VCHAR, WSP)), 
        p.lazy(()=> obs_qp)
    );

    // 3.2.2.  Folding White Space and Comments ///////////////////////////////////////////////////////////////

    // FWS             =   ([*WSP CRLF] 1*WSP) /  obs-FWS
    //                                       ; Folding white space
    var FWS: p.Parser<string>  = p.or(
        p.tail( p.optional(p.tail(j.many(WSP), CRLF)), j.many1(WSP)), 
        p.lazy(()=> obs_FWS )
    );

    // ctext           =   %d33-39 /          ; Printable US-ASCII
    //                   %d42-91 /          ;  characters not including
    //                   %d93-126 /         ;  "(", ")", or "\"
    //                   obs-ctext
    var ctext: p.Parser<string>  = p.or(
        p.range(33, 39),
        p.range(42, 91),
        p.range(93, 126),
        p.lazy(()=> obs_ctext )
    );

    // ccontent        =   ctext / quoted-pair / comment
    var ccontent: p.Parser<string> = p.or(ctext, quoted_pair, p.lazy(()=> comment));

    // comment         =   "(" *([FWS] ccontent) [FWS] ")"
    var comment: p.Parser<string> = p.tail("(", p.many(p.tail(p.optional(FWS), ccontent)), p.optional(FWS), ")");

    // CFWS            =   (1*([FWS] comment) [FWS]) / FWS
    var CFWS: p.Parser<string>  = p.or( 
        p.tail(
            j.many1( p.tail(p.option("", FWS), comment) ), 
            p.option("", FWS)
        ), 
        FWS
    );

    // 3.2.3.  Atom //////////////////////////////////////////////////////////////////////////////////////////

    // atext           =   ALPHA / DIGIT /    ; Printable US-ASCII
    //                    "!" / "#" /        ;  characters not including
    //                    "$" / "%" /        ;  specials.  Used for atoms.
    //                    "&" / "'" /
    //                    "*" / "+" /
    //                    "-" / "/" /
    //                    "=" / "?" /
    //                    "^" / "_" /
    //                    "`" / "{" /
    //                    "|" / "}" /
    //                    "~"
    var atext: p.Parser<string> = p.or(
        ALPHA, DIGIT, 
        p.string("!"), p.string("#"),
        p.string("$"), p.string("%"),
        p.string("&"), p.string("'"),
        p.string("*"), p.string("+"),
        p.string("-"), p.string("/"),
        p.string("="), p.string("?"),
        p.string("^"), p.string("_"),
        p.string("`"), p.string("{"),
        p.string("|"), p.string("}"),
        p.string("~")
    );

    // atom            =   [CFWS] 1*atext [CFWS]
    var atom: p.Parser<string> = p.between(p.optional(CFWS), j.many1(atext), p.optional(CFWS)); 

    // dot-atom-text   =   1*atext *("." 1*atext)
    var dot_atom_text: p.Parser<string> = j.sepBy1(j.many1(atext), p.string("."));

    // dot-atom        =   [CFWS] dot-atom-text [CFWS]
    var dot_atom: p.Parser<string> = p.between(p.optional(CFWS), j.many1(p.lazy(()=>dot_atom_text)), p.optional(CFWS));

    // specials        =   "(" / ")" /        ; Special characters that do
    //                    "<" / ">" /        ;  not appear in atext
    //                    "[" / "]" /
    //                    ":" / ";" /
    //                    "@" / "\" /
    //                    "," / "." /
    //                    DQUOTE

    // 3.2.4.  Quoted Strings ////////////////////////////////////////////////////////////////////////////////

    // qtext           =   %d33 /             ; Printable US-ASCII
    //                    %d35-91 /          ;  characters not including
    //                    %d93-126 /         ;  "\" or the quote character
    //                    obs-qtext
    var qtext: p.Parser<string> = p.or(
        p.charCode(33),
        p.range(35, 91),
        p.range(93, 126),
        p.lazy(()=> obs_q_text )
    );

    // qcontent        =   qtext / quoted-pair
    var qcontent: p.Parser<string> = p.or(qtext, quoted_pair);

    // quoted-string   =       [CFWS]
    //                         DQUOTE *([FWS] qcontent) [FWS] DQUOTE
    //                         [CFWS]
    var quoted_string: p.Parser<string> = p.between(
        p.optional(CFWS),
        p.between(
            DQUOTE, 
            j.many(p.seq(s=>{
                s(p.optional(FWS));
                return s(qcontent);
            })),
            DQUOTE
        ),
        p.optional(CFWS)
    );

    // 3.2.5.  Miscellaneous Tokens //////////////////////////////////////////////////////////////////////////////

    // word            =       atom / quoted-string
    var word: p.Parser<string> = p.or(atom, quoted_string);

    // phrase          =       1*word / obs-phrase
    var phrase: p.Parser<string> = p.or(j.many1(word), p.lazy(()=> obs_phrase));

    // unstructured    =   (*([FWS] VCHAR) *WSP) / obs-unstruct

    // 3.4.  Address Specification /////////////////////////////////////////////////////////////////////////////
    /*
    // address         =   mailbox / group
    //var address: p.Parser<string> = p.or(mailbox, group);

    // mailbox         =   name-addr / addr-spec
    //var mailbox: p.Parser<string> = p.or(name_addr, addr_spec);

    // name-addr       =   [display-name] angle-addr
    var name_addr: p.Parser<string> = p.or(p.optional(display_name), p.lazy(()=> angle_addr));

    // angle-addr      =   [CFWS] "<" addr-spec ">" [CFWS] /
    //                    obs-angle-addr
    var angle_addr: p.Parser<string> = p.or(
        p.tail(
            p.optional(CFWS),
            p.string("<"),
            p.lazy(()=> addr_spec ),
            p.string(">"),
            p.optional(CFWS)
        ),
        p.lazy(()=> obs_angle_addr )
    );

    // group           =   display-name ":" [group-list] ";" [CFWS]
//    var group: p.Parser<string> = p.tailj(
//        display_name, 
//        p.string(":"),  
//        p.optional(group_list),
//        p.string(";"),
//        p.optional(CFWS)
//    );

    // display-name    =   phrase
    var display_name: p.Parser<string> = phrase;

    // mailbox-list    =   (mailbox *("," mailbox)) / obs-mbox-list
    //var mailbox_list: p.Parser<string> = p.or( p.tailj(mailbox, j.many(p.tailj(p.string(","), mailbox))), obs_mbox_list );

    // address-list    =   (address *("," address)) / obs-addr-list
    //var address_list: p.Parser<string> = p.or( p.tailj(address, j.many(p.tailj(p.string(","), address))), obs_addr_list );

    // group-list      =   mailbox-list / CFWS / obs-group-list    
//    var group_list: p.Parser<string> = p.or( mailbox_list, CFWS, obs_group_list );    
    */
    // 3.4.1.  Addr-Spec Specification //////////////////////////////////////////////////////////////////////

    // addr-spec       =   local-part "@" domain
    var addr_spec: p.Parser<string> = p.seq((s,o)=>{
        o.localPart = s(p.lazy(()=>local_part)); 
        s(p.string("@"));
        o.domain = s(p.lazy(()=> domain));
    });

    // local-part      =   dot-atom / quoted-string / obs-local-part
    var local_part: p.Parser<string> = p.or(dot_atom, quoted_string, p.lazy(()=> obs_local_part ));

    // domain          =   dot-atom / domain-literal / obs-domain
    var domain: p.Parser<string> = p.or(
        p.lazy(()=> obs_domain), // 順番変えてある
        dot_atom, 
        p.lazy(()=> domain_literal ) 
    );

    // domain-literal  =   [CFWS] "[" *([FWS] dtext) [FWS] "]" [CFWS]
    var domain_literal: p.Parser<string> = p.seq((s,o)=>{
        s(p.optional(CFWS)); 
        s(p.string("["));
        var domain = s(p.many(p.tail(p.optional(FWS), p.lazy(()=> dtext) ))); 
        s(p.optional(FWS)); 
        s(p.string("]"));
        s(p.optional(CFWS));
        return domain;
    });

    // dtext           =   %d33-90 /          ; Printable US-ASCII
    //                     %d94-126 /         ;  characters not including
    //                     obs-dtext          ;  "[", "]", or "\"    
    var dtext: p.Parser<string> = p.or(
        p.range(33, 90),
        p.range(94, 126),
        p.lazy(()=> obs_dtext )
    );

    // 4.1.  Miscellaneous Obsolete Tokens /////////////////////////////////////////////////////////////////////

    // obs-NO-WS-CTL   =   %d1-8 /            ; US-ASCII control
    //                     %d11 /             ;  characters that do not
    //                     %d12 /             ;  include the carriage
    //                     %d14-31 /          ;  return, line feed, and
    //                     %d127              ;  white space characters
    var obs_NO_WS_CTL: p.Parser<string> = p.or(
        p.range(1, 8),
        p.charCode(11),
        p.charCode(12),
        p.range(14, 31),
        p.charCode(127)
    );


    // obs-ctext       =   obs-NO-WS-CTL
    var obs_ctext: p.Parser<string> = obs_NO_WS_CTL;

    // obs-qtext       =   obs-NO-WS-CTL
    var obs_q_text: p.Parser<string> = obs_NO_WS_CTL;

    // obs-utext       =   %d0 / obs-NO-WS-CTL / VCHAR
    var obs_utext: p.Parser<string> = p.or( p.charCode(0), obs_NO_WS_CTL, VCHAR);

    // obs-qp          =   "\" (%d0 / obs-NO-WS-CTL / LF / CR)
    var obs_qp: p.Parser<string> = p.tail(p.string("\\"), p.or(p.charCode(0), obs_NO_WS_CTL, LF, CR));

    // obs-body        =   *((*LF *CR *((%d0 / text) *LF *CR)) / CRLF)

    // obs-unstruct    =   *((*LF *CR *(obs-utext *LF *CR)) / FWS)

    // obs-phrase      =   word *(word / "." / CFWS)
    var obs_phrase: p.Parser<string> = p.tail(word, j.many1(p.or(word, p.string("."), CFWS)));

    // obs-phrase-list =   [phrase / CFWS] *("," [phrase / CFWS])    

    // 4.1.2.  Command Argument Syntax /////////////////////////////////////////////////////////////////////////////////////////

    // Reverse-path   = Path / "<>"

    // Forward-path   = Path

    // Path           = "<" [ A-d-l ":" ] Mailbox ">"

    // A-d-l          = At-domain *( "," At-domain )
    //               ; Note that this form, the so-called "source
    //               ; route", MUST BE accepted, SHOULD NOT be
    //               ; generated, and SHOULD be ignored.

    // At-domain      = "@" Domain

    // Mail-parameters  = esmtp-param *(SP esmtp-param)

    // Rcpt-parameters  = esmtp-param *(SP esmtp-param)

    // esmtp-param    = esmtp-keyword ["=" esmtp-value]

    // esmtp-keyword  = (ALPHA / DIGIT) *(ALPHA / DIGIT / "-")

    // esmtp-value    = 1*(%d33-60 / %d62-126)
    //               ; any CHAR excluding "=", SP, and control
    //               ; characters.  If this string is an email address,
    //               ; i.e., a Mailbox, then the "xtext" syntax [32]
    //               ; SHOULD be used.

    // Keyword        = Ldh-str

    // Argument       = Atom

    // Let-dig        = ALPHA / DIGIT
    var Let_dig: p.Parser<string> = p.or(ALPHA, DIGIT);

    // Ldh-str        = *( ALPHA / DIGIT / "-" ) Let-dig
    // ココの定義、このままだと *( ALPHA / DIGIT / "-" ) が読みすぎて Let-dig　の分がなくなってしまう。 
    // ( ALPHA / DIGIT / "-" ) は次の要素が ( ALPHA / DIGIT / "-" ) か Let-dig なら読み進めていいから、
    // lookAhead(Let_dig) する
    var Ldh_str: p.Parser<string> = p.tail(
        j.many(p.triable(p.seq(s=>{
            var c = s(p.or(ALPHA, DIGIT, p.string("-"))); 
            s(p.lookAhead(Let_dig));
            return c;
        }))), 
        Let_dig
    );


    // sub-domain     = Let-dig [Ldh-str]
    //var sub_domain: p.Parser<string> = p.head(Let_dig, p.optional(Ldh_str));
    var sub_domain: p.Parser<string> = p.seq(s=>{
        var h = s(Let_dig);
        var c = s(p.optional(Ldh_str));
        return h + c;
    }); 

    // address-literal  = "[" ( IPv4-address-literal /
    //                 IPv6-address-literal /
    //                 General-address-literal ) "]"
    //                 ; See Section 4.1.3
    var address_literal: p.Parser<string> = p.seq(s=>{
        s(p.string("["));
        var a = s(p.or( 
            p.lazy(()=> IPv4_address_literal), 
            p.lazy(()=> IPv6_address_literal), 
            p.lazy(()=> General_address_literal)
        ));
        s(p.string("]"));
        return a;
    });

    // Atom           = 1*atext
    var Atom: p.Parser<string> = j.many1(atext);

    // quoted-pairSMTP  = %d92 %d32-126
    //                 ; i.e., backslash followed by any ASCII
    //                 ; graphic (including itself) or SPace
    var quoted_pairSMTP: p.Parser<string> = p.tail(p.charCode(92), p.range(32, 126));

    // qtextSMTP      = %d32-33 / %d35-91 / %d93-126
    //               ; i.e., within a quoted string, any
    //               ; ASCII graphic or space is permitted
    //               ; without blackslash-quoting except
    //               ; double-quote and the backslash itself.
    var qtextSMTP: p.Parser<string> = p.or(p.range(32, 33), p.range(35, 91), p.range(93, 126));

    // QcontentSMTP   = qtextSMTP / quoted-pairSMTP
    var QcontentSMTP: p.Parser<string> = p.or(qtextSMTP, quoted_pairSMTP);

    // Quoted-string  = DQUOTE *QcontentSMTP DQUOTE
    var Quoted_string: p.Parser<string> = p.between(DQUOTE, j.many(QcontentSMTP), DQUOTE);


    // Domain         = sub-domain *("." sub-domain)
    var Domain: p.Parser<string> = j.sepBy1(sub_domain, p.string("."));

    // Dot-string     = Atom *("."  Atom)
    var Dot_string: p.Parser<string> = j.sepBy1(Atom, p.string("."));

    // Local-part     = Dot-string / Quoted-string
    //               ; MAY be case-sensitive
    var Local_part: p.Parser<string> = p.or(Dot_string, Quoted_string);

    // String         = Atom / Quoted-string    

    // Mailbox        = Local-part "@" ( Domain / address-literal )
    var Mailbox: p.Parser<string> = p.seq((s,o)=>{
        o.localPart = s(Local_part); 
        s("@"); 
        o.domain = s(p.or(Domain, address_literal));
    });


    // 4.1.3.  Address Literals ///////////////////////////////////////////////////////////////////////////////////////////////

    // dcontent       = %d33-90 / ; Printable US-ASCII
    //                %d94-126 ; excl. "[", "\", "]"
    var dcontent: p.Parser<string> = p.or(p.range(33, 90), p.range(94, 126));

    // Standardized-tag  = Ldh-str
    //                   ; Standardized-tag MUST be specified in a
    //                   ; Standards-Track RFC and registered with IANA
    var Standardized_tag: p.Parser<string> = Ldh_str;

    // Snum           = 1*3DIGIT
    //                ; representing a decimal integer
    //                ; value in the range 0 through 255
    var Snum: p.Parser<string> = j.repeat(1, 3, DIGIT);

    // IPv6-hex       = 1*4HEXDIG
    var IPv6_hex: p.Parser<string> = j.repeat(1, 4, HEXDIG);

    // IPv6-full      = IPv6-hex 7(":" IPv6-hex)
    var IPv6_full: p.Parser<string> = j.sepByN(8, 8, IPv6_hex, p.string(":"));

    // IPv4-address-literal  = Snum 3("."  Snum)
    var IPv4_address_literal: p.Parser<string> = j.sepByN(4, 4, p.lazy(()=> Snum), p.string("."));

    // IPv6-address-literal  = "IPv6:" IPv6-addr
    var IPv6_address_literal: p.Parser<string> = p.seq(s=>{
        s(p.string("IPv6:"));
        s(p.lazy(()=> IPv6_addr));
    });

    // General-address-literal  = Standardized-tag ":" 1*dcontent
    var General_address_literal: p.Parser<string> = p.tail(Standardized_tag, p.string(":"), j.many1(dcontent));

    // IPv6-comp      = [IPv6-hex *5(":" IPv6-hex)] "::"
    //                  [IPv6-hex *5(":" IPv6-hex)]
    //               ; The "::" represents at least 2 16-bit groups of
    //               ; zeros.  No more than 6 groups in addition to the
    //               ; "::" may be present.
    var IPv6_comp: p.Parser<string> = p.seq((s,o)=>{
        s(p.sepByN(0, 6, IPv6_hex, p.string(":")));
        s("::");
        s(p.sepByN(0, 6, IPv6_hex, p.string(":")));
    });
    
    // IPv6v4-full    = IPv6-hex 5(":" IPv6-hex) ":" IPv4-address-literal
    var IPv6v4_full: p.Parser<string> = p.seq((s,o)=>{
        s(p.sepByN(6, 6, IPv6_hex, p.string(":")));
        s(":");
        s(IPv4_address_literal);
    });

    // IPv6v4-comp    = [IPv6-hex *3(":" IPv6-hex)] "::"
    //                  [IPv6-hex *3(":" IPv6-hex) ":"]
    //               IPv4-address-literal
    //               ; The "::" represents at least 2 16-bit groups of
    //               ; zeros.  No more than 4 groups in addition to the
    //               ; "::" and IPv4-address-literal may be present.
    var IPv6v4_comp: p.Parser<string> = p.seq((s,o)=>{
        s(p.sepByN(0, 4, IPv6_hex, p.string(":"))); 
        s("::");
        // 12.34.56.78] 
        // という入力で、これはipv4のアドレスであるにも関わらず、先頭の12をipv4のアドレスとして読んでしまう。
        // 仕方ないので、さきにipv4として読めるかどうか試す
        s(p.or(
            p.triable(IPv4_address_literal),
            p.seq(s=>{
                s(p.sepByN(0, 4, IPv6_hex, p.string(":")));
                s(IPv4_address_literal);
            })
        ));
    });  

    // IPv6-addr      = IPv6-full / IPv6-comp / IPv6v4-full / IPv6v4-comp
    var IPv6_addr: p.Parser<string> = p.or(
        p.triable(IPv6v4_comp),    // 順番変えた
        p.triable(IPv6_full),  
        p.triable(IPv6_comp),
        IPv6v4_full
    );


    // 4.2.  Obsolete Folding White Space ///////////////////////////////////////////////////////////////

    // obs-FWS         =   1*WSP *(CRLF 1*WSP)
    var obs_FWS: p.Parser<string> = j.sepBy1(j.many1(WSP), CRLF);


    // 4.4.  Obsolete Addressing /////////////////////////////////////////////////////////////////////////////////

    // obs-angle-addr  =   [CFWS] "<" obs-route addr-spec ">" [CFWS]
    var obs_angle_addr: p.Parser<string> = p.between(
        p.optional(CFWS),
        p.between(
            p.optional(p.string("<")),
            p.tail(p.lazy(()=> obs_route), addr_spec),
            p.optional(p.string(">"))
        ),
        p.optional(CFWS)
    );

    // obs-route       =   obs-domain-list ":"
    var obs_route: p.Parser<string> = p.tail(p.lazy(()=> obs_domain_list), p.string(":"));

    // obs-domain-list =   *(CFWS / ",") "@" domain
    //                     *("," [CFWS] ["@" domain])
    var obs_domain_list: p.Parser<string> = p.seq(s=>{
        s(p.many(p.or(CFWS, p.string(","))));
        s(p.string("@")); 
        s(domain);
        s(p.many(p.tail(
            p.string(","), 
            p.optional(CFWS), 
            p.optional(p.tail(p.string("@"), domain))
        )));
    });

    // obs-mbox-list   =   *([CFWS] ",") mailbox *("," [mailbox / CFWS])
    //var obs_mbox_list = p.tailj(
    //    j.many(p.tailj(p.optional(CFWS), p.string(","))),
    //    mailbox,
    //    j.many(p.tailj( p.string(","), p.optional(p.or(mailbox, CFWS))))
    //);

    // obs-addr-list   =   *([CFWS] ",") address *("," [address / CFWS])
    //var obs_addr_list = p.tailj(
    //    j.many(p.tailj(p.optional(CFWS), p.string(","))),
    //    address,
    //    j.many(p.tailj( p.string(","), p.optional(p.or(mailbox, CFWS))))
    //);

    // obs-group-list  =   1*([CFWS] ",") [CFWS]
    var obs_group_list: p.Parser<string> = j.sepBy1(p.option("", CFWS), p.string(","));

    // obs-local-part  =   word *("." word)
    var obs_local_part: p.Parser<string> = j.sepBy1(word, p.string("."));

    // obs-domain      =   atom *("." atom)
    var obs_domain: p.Parser<string> =  j.sepBy1(atom, p.string("."));

    // obs-dtext       =   obs-NO-WS-CTL / quoted-pair
    var obs_dtext: p.Parser<string> = p.or(obs_NO_WS_CTL, quoted_pair);

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    export function validate(address: string): boolean {
        if(address.length >= 257) return false;
        var parser = Mailbox;
        var result = p.parse(p.seq(s=>{ s(parser);  s(p.eof); }), address);
        return result.success;
    }


    if(window["test"]){
        function validateFile(path: string, sign: boolean){
            var xhr = new XMLHttpRequest();
            xhr.open("GET", path, false);
            xhr.send(null);
            xhr.responseText.replace(/\r\n|\r/g, '\n').split(/\n/).forEach(address => {
                test("[" + (sign ? "" : "in")  + "valid]" + address, ()=>{
                    var result = validate(address);
                    ok(sign === result, address);
                });
            });
        }

        validateFile("valid.txt", true);
        validateFile("valid2.txt", true);
        //validateFile("valid3.txt", true);   
        validateFile("invalid2.txt", false);    
    }
}